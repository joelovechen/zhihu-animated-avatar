// GIF → animated WebP. Container: https://developers.google.com/speed/webp/docs/riff_container
'use strict';
function validateRiff(bytes) {
    if (bytes.length < 20 || String.fromCharCode(...bytes.subarray(0,4)) !== 'RIFF' ||
        String.fromCharCode(...bytes.subarray(8,12)) !== 'WEBP' ||
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 !== bytes.length) {
        throw new Error('WebP 文件头或长度无效，请重新导出文件');
    }
}
function le24(n) {
    return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
}

function webpChunk(tag, payload) {
    var size = payload.length;
    var out = new Uint8Array(8 + size + (size & 1)); // 奇数长度补 1 字节 pad
    for (var i = 0; i < 4; i++) out[i] = tag.charCodeAt(i);
    out[4] = size & 0xff;
    out[5] = (size >> 8) & 0xff;
    out[6] = (size >> 16) & 0xff;
    out[7] = (size >> 24) & 0xff;
    out.set(payload, 8);
    return out;
}

// 从静态 WebP 中取出帧图像块（含 tag+size 头与偶对齐补齐字节）
function extractFrameChunks(buf) {
    var u8 = new Uint8Array(buf);
    validateRiff(u8);
    var chunks = [];
    var hasAlpha = false;
    var p = 12; // RIFF(4) + size(4) + WEBP(4)
    while (p + 8 <= u8.length) {
        var size = new DataView(u8.buffer, u8.byteOffset).getUint32(p + 4, true);
        if (p + 8 + size + (size & 1) > u8.length) throw new Error('WebP 数据块被截断');
        var tag = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]);
        if (tag === 'VP8 ' || tag === 'VP8L' || tag === 'ALPH') {
            chunks.push(u8.subarray(p, p + 8 + size + (size & 1)));
            if (tag === 'ALPH' || (tag === 'VP8L' && size >= 5 && (u8[p + 12] & 0x10))) hasAlpha = true;
        }
        p += 8 + size + (size & 1);
    }
    if (!chunks.some(c => ['VP8 ', 'VP8L'].includes(String.fromCharCode(...c.subarray(0, 4))))) throw new Error('缺少 WebP 图像数据');
    return { chunks: chunks, hasAlpha: hasAlpha };
}

function muxAnimatedWebp(frames, width, height) {
    if (!frames.length || width < 1 || height < 1 || width > 16383 || height > 16383) throw new Error('无效的帧或尺寸');
    var parts = [];

    // VP8X：动画标志（+ 透明标志，若任一帧含 ALPH 块）+ 画布尺寸（各 24 bit 存"值-1"）
    var hasAlpha = frames.some(function (f) { return f.hasAlpha; });
    var vp8x = new Uint8Array(10);
    vp8x[0] = 0x02 | (hasAlpha ? 0x10 : 0);
    // 字节 1-3 为保留位（必须为 0）
    vp8x.set(le24(width - 1), 4);
    vp8x.set(le24(height - 1), 7);
    parts.push(webpChunk('VP8X', vp8x));

    // ANIM：背景色（透明）+ 循环次数（0 = 无限循环）
    parts.push(webpChunk('ANIM', new Uint8Array([0, 0, 0, 0, 0, 0])));

    frames.forEach(function (f) {
        var header = new Uint8Array(16);
        header.set(le24(0), 0);           // Frame X = 0
        header.set(le24(0), 3);           // Frame Y = 0
        header.set(le24(width - 1), 6);   // Frame Width - 1
        header.set(le24(height - 1), 9);  // Frame Height - 1
        header.set(le24(Math.min(0xffffff, f.duration)), 12); // Duration (ms)
        header[15] = 2;                   // 不混合，完整帧直接替换上一帧

        var len = 16;
        f.chunks.forEach(function (c) { len += c.length; });
        var payload = new Uint8Array(len);
        payload.set(header, 0);
        var off = 16;
        f.chunks.forEach(function (c) { payload.set(c, off); off += c.length; });
        parts.push(webpChunk('ANMF', payload));
    });

    var total = 4; // "WEBP"
    parts.forEach(function (p) { total += p.length; });
    var file = new Uint8Array(8 + total);
    file.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    file[4] = total & 0xff;
    file[5] = (total >> 8) & 0xff;
    file[6] = (total >> 16) & 0xff;
    file[7] = (total >> 24) & 0xff;
    file.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
    var off = 12;
    parts.forEach(function (p) { file.set(p, off); off += p.length; });
    return file;
}

/* ================= GIF → 动态 WebP 转换 =================
 * ImageDecoder（Chrome 94+）负责解码并自动合成完整帧，
 * 每帧经 canvas 编码为静态 WebP 后交由 muxAnimatedWebp 拼装。
 */

async function convertGifToWebp(arrayBuffer, onProgress) {
    if (typeof ImageDecoder === 'undefined') {
        throw new Error('浏览器不支持 ImageDecoder（需 Chrome 94+）');
    }
    var decoder = new ImageDecoder({ data: arrayBuffer, type: 'image/gif' });
    try {
        await decoder.tracks.ready;
        var track = decoder.tracks.selectedTrack;
        var frameCount = track && track.frameCount;
        if (!frameCount) throw new Error('无法解析 GIF 帧数');
        if (frameCount > 600) throw new Error('GIF 超过 600 帧，请先缩短动画');

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var frames = [];

        for (var i = 0; i < frameCount; i++) {
            var res = await decoder.decode({ frameIndex: i }); // 默认返回合成后的完整帧
            var image = res.image;
            // 注意：帧时长在 image.duration（微秒）上，且必须在 image.close() 前读取
            var us = Number(image.duration) || 0;
            var w = image.displayWidth || image.codedWidth;
            var h = image.displayHeight || image.codedHeight;
            if (w * h > 4096 * 4096 || w * h * frameCount > 300000000) { image.close(); throw new Error('GIF 分辨率或总帧像素过大，请先缩小图片'); }
            if (i === 0) { canvas.width = w; canvas.height = h; }
            try {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, w, h);
            } finally { image.close(); }

            var blob = await new Promise(function (r) { canvas.toBlob(r, 'image/webp', 0.9); });
            if (!blob || blob.type !== 'image/webp') throw new Error('第 ' + (i + 1) + ' 帧编码失败');
            var e = extractFrameChunks(await blob.arrayBuffer());
            frames.push({
                chunks: e.chunks,
                hasAlpha: e.hasAlpha,
                // µs → ms；为 0 时按浏览器惯例兜底 100ms，保留解码器给出的有效帧时长
                duration: us > 0 ? Math.round(us / 1000) : 100
            });
            if (onProgress) onProgress(i + 1, frameCount);
        }
        return {
            buf: muxAnimatedWebp(frames, canvas.width, canvas.height),
            frameCount: frameCount
        };
    } finally {
        try { decoder.close(); } catch (e) { /* ignore */ }
    }
}

/* ================= 产物校验 =================
 * 上传前先本地解码一遍，防止把畸形文件交给服务端（弹窗页是安全上下文，
 * ImageDecoder 可用）。逐帧解码验证，避免只验证首帧。
 */

async function verifyWebp(blob) {
    if (typeof ImageDecoder === 'undefined') throw new Error('请使用新版 Chrome / Edge（需要 ImageDecoder）');
    var buf = await blob.arrayBuffer();
    validateRiff(new Uint8Array(buf));
    var dec = new ImageDecoder({ data: buf, type: 'image/webp' });
    try {
        await dec.tracks.ready;
        var track = dec.tracks.selectedTrack;
        var n = (track && track.frameCount) || 0;
        if (n < 1) throw new Error('未解析到任何帧，文件可能不是有效 WebP');
        if (n > 600) throw new Error('WebP 超过 600 帧，请先缩短动画');
        for (var i = 0; i < n; i++) {
            var r = await dec.decode({ frameIndex: i });
            var pixels = r.image.displayWidth * r.image.displayHeight;
            r.image.close();
            if (pixels > 4096 * 4096 || pixels * n > 300000000) throw new Error('WebP 分辨率或总帧像素过大');
        }
        return n;
    } finally {
        try { dec.close(); } catch (e) { /* ignore */ }
    }
}

function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error('读取文件失败')); };
        reader.readAsDataURL(blob);
    });
}

