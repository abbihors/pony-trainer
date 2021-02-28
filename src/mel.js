let tf = require('@tensorflow/tfjs');

// Convert freqs tensor to mel
function hzToMel(freqs) {
    let f_min = 0;
    let f_sp = 200 / 3;

    let mels = freqs.sub(f_min).div(f_sp);

    // Fill in the log scale part
    let min_log_hz = 1000.0;
    let min_log_mel = (min_log_hz - f_min) / f_sp;
    let logstep = tf.log(6.4).div(27.0);

    console.log(freqs.div(min_log_hz).log().dataSync());
    mels = mels.where(freqs.less(min_log_hz), freqs.div(min_log_hz).log().div(logstep).add(min_log_mel));

    return mels;
}

let res = hzToMel(tf.tensor([11025.0]));
console.log(res.dataSync());

// create mel filter bank
function mel(sr, n_fft = 2048, n_mels = 128, fmin = 0.0, fmax, htk=false, norm='slaney') {
    if (fmax == null) {
        fmax = sr / 2;
    }

    // Initialize weights
    let weights = tf.zeros([n_mels, 1 + Math.floor(n_fft / 2)]);

    let fftfreqs = tf.linspace(0, sr / 2, 1 + (n_fft / 2));
}

mel(16000);

// low_freq_mel = 0
// high_freq_mel = (2595 * numpy.log10(1 + (sample_rate / 2) / 700))  # Convert Hz to Mel

// mel_points = numpy.linspace(low_freq_mel, high_freq_mel, nfilt + 2)  # Equally spaced in Mel scale
// hz_points = (700 * (10**(mel_points / 2595) - 1))  # Convert Mel to Hz

// bin = numpy.floor((NFFT + 1) * hz_points / sample_rate)
// fbank = numpy.zeros((nfilt, int(numpy.floor(NFFT / 2 + 1))))

// for m in range(1, nfilt + 1):
//     f_m_minus = int(bin[m - 1])   # left
//     f_m = int(bin[m])             # center
//     f_m_plus = int(bin[m + 1])    # right

//     for k in range(f_m_minus, f_m):
//         fbank[m - 1, k] = (k - bin[m - 1]) / (bin[m] - bin[m - 1])
//     for k in range(f_m, f_m_plus):
//         fbank[m - 1, k] = (bin[m + 1] - k) / (bin[m + 1] - bin[m])

// filter_banks = numpy.dot(pow_frames, fbank.T)
// filter_banks = numpy.where(filter_banks == 0, numpy.finfo(float).eps, filter_banks)  # Numerical Stability
// filter_banks = 20 * numpy.log10(filter_banks)  # dB