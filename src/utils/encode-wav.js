// See: http://soundfile.sapp.org/doc/WaveFormat/
export function encodeWavInt16(samples, sampleRate, numChannels) {
    const byteWidth = 2; // Let's just do int16 for now
    const dataSize = samples.length * numChannels * byteWidth;
    
    let buffer = new ArrayBuffer(44 + dataSize);
    let view = new DataView(buffer);

    // 'RIFF' chunk descriptor
    setString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    setString(view, 8, 'WAVE');
    
    // 'fmt' subchunk
    setString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true); // No compression
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * byteWidth, true);
    view.setUint16(32, numChannels * byteWidth, true);
    view.setUint16(34, byteWidth * 8, true);

    // 'data' subchunk
    setString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write the actual data
    let index = 44;

    for (let i = 0; i < samples.length; i++) {
        view.setInt16(index, samples[i] * 0x7FFF, true);

        index += byteWidth;
    }

    return buffer;
}

function setString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
