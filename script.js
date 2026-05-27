const AC = new (window.AudioContext || window.webkitAudioContext)();
let masterGain, musicGain, sfxGain;
let musicNodes = [];
let muted = false;
let sfxVolume = 0.8;

function initAudio() {
    masterGain = AC.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(AC.destination);

    musicGain = AC.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(masterGain);

    sfxGain = AC.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(masterGain);

    startBGM();
}

function note(freq, start, dur, type = 'square', vol = 0.12, dest = musicGain) {
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.setValueAtTime(vol, start + dur - 0.02);
    g.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(g);
    g.connect(dest);
    o.start(start);
    o.stop(start + dur);
    return o;
}

function startBGM() {
    const BPM = 138, beat = 60 / BPM, bar = beat * 4;
    const mel = [523, 523, 659, 784, 880, 784, 659, 523, 587, 587, 698, 880, 988, 880, 698, 587, 523, 659, 784, 880, 784, 659, 523, 440, 494, 587, 698, 784, 698, 587, 494, 392];
    const bas = [262, 0, 294, 0, 330, 0, 294, 0, 262, 0, 294, 0, 349, 0, 330, 0];
    const loopLen = bar * 4;
    let loopStart = AC.currentTime + 0.1;

    function scheduleLoop(t) {
        mel.forEach((f, i) => { if (!f) return; note(f, t + i * beat * 0.5, beat * 0.45, 'square', 0.10); });
        bas.forEach((f, i) => { if (!f) return; note(f, t + i * beat * 0.5, beat * 0.9, 'sawtooth', 0.07); });

        for (let i = 0; i < 16; i++) {
            const buf = AC.createBuffer(1, AC.sampleRate * 0.05, AC.sampleRate);
            const d = buf.getChannelData(0);
            for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * 0.3;

            const src = AC.createBufferSource();
            const hg = AC.createGain();
            src.buffer = buf;
            hg.gain.setValueAtTime(0.06, t + i * beat * 0.5);
            hg.gain.linearRampToValueAtTime(0, t + i * beat * 0.5 + 0.04);
            src.connect(hg);
            hg.connect(musicGain);
            src.start(t + i * beat * 0.5);
            musicNodes.push(src);
        }
    }

    function loop() {
        if (AC.currentTime > loopStart - 0.5) {
            scheduleLoop(loopStart);
            loopStart += loopLen;
        }
        setTimeout(loop, 200);
    }
    loop();
}

function sfxClick() {
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, AC.currentTime);
    o.frequency.linearRampToValueAtTime(1200, AC.currentTime + 0.06);
    g.gain.setValueAtTime(sfxVolume * 0.3, AC.currentTime);
    g.gain.linearRampToValueAtTime(0, AC.currentTime + 0.1);
    o.connect(g);
    g.connect(sfxGain);
    o.start();
    o.stop(AC.currentTime + 0.11);
}

function sfxWin() {
    const t = AC.currentTime;
    [[523, .0], [659, .1], [784, .2], [1047, .3], [1319, .45]].forEach(([f, d]) => note(f, t + d, 0.12, 'square', 0.18, sfxGain));
}

function sfxLose() {
    const t = AC.currentTime;
    [[440, .0], [370, .1], [294, .2], [220, .35]].forEach(([f, d]) => note(f, t + d, 0.14, 'sawtooth', 0.15, sfxGain));
}

function sfxDraw() {
    const t = AC.currentTime;
    [[523, .0], [494, .1], [523, .2]].forEach(([f, d]) => note(f, t + d, 0.1, 'triangle', 0.14, sfxGain));
}

function sfxGameOver() {
    const t = AC.currentTime;
    [[330, .0], [277, .15], [220, .3], [185, .5], [147, .7]].forEach(([f, d]) => note(f, t + d, 0.2, 'sawtooth', 0.2, sfxGain));
}

function resumeAC() {
    if (AC.state === 'suspended') {
        AC.resume().then(() => { if (!musicNodes.length || !musicGain) initAudio(); });
    }
}

let soundOn = true;
function toggleSound() {
    resumeAC();
    soundOn = !soundOn;
    masterGain.gain.value = soundOn ? 1 : 0;
    document.getElementById('sound-btn').textContent = soundOn ? '🔊' : '🔇';
}

function setMusicVol(v) {
    resumeAC();
    if (musicGain) musicGain.gain.value = v / 100;
}

function setSfxVol(v) {
    sfxVolume = v / 100;
    if (sfxGain) sfxGain.gain.value = v / 100;
}

function toggleMute() {
    resumeAC();
    muted = !muted;
    masterGain.gain.value = muted ? 0 : 1;
    const btn = document.getElementById('mute-btn');
    btn.textContent = muted ? 'Desmutar' : 'Mutar';
    btn.classList.toggle('muted', muted);
    document.getElementById('sound-btn').textContent = muted ? '🔇' : '🔊';
    soundOn = !muted;
}

document.addEventListener('click', function onFirst() {
    initAudio();
    document.removeEventListener('click', onFirst);
}, { once: true });

(function buildBg() {
    const bg = document.getElementById('bg');
    const cloudColors = ['#dce9ff', '#f0e6ff', '#e0f7fa', '#fce4ec'];

    for (let i = 0; i < 7; i++) {
        const c = document.createElement('canvas');
        const px = 10, cols = 4, rows = 2;
        c.width = cols * px;
        c.height = rows * px;
        const ctx = c.getContext('2d');
        const pattern = [[1, 1, 1, 0], [0, 1, 1, 1]];
        const col = cloudColors[Math.floor(Math.random() * cloudColors.length)];

        pattern.forEach((row, ry) => row.forEach((v, rx) => {
            if (!v) return;
            ctx.fillStyle = col;
            ctx.fillRect(rx * px, ry * px, px, px);
            ctx.fillStyle = 'rgba(255,255,255,.55)';
            ctx.fillRect(rx * px, ry * px, px, 2);
        }));

        const el = document.createElement('div');
        el.className = 'cloud';
        const scale = Math.random() * 2.5 + 2;
        const dur = Math.random() * 35 + 22;
        el.style.cssText = `top:${Math.random() * 55 + 5}%;left:-${scale * cols * px}px;width:${scale * cols * px}px;height:${scale * rows * px}px;background:url(${c.toDataURL()}) no-repeat center/contain;image-rendering:pixelated;animation-duration:${dur}s;animation-delay:-${Math.random() * dur}s;opacity:${Math.random() * .35 + .5};`;
        bg.appendChild(el);
    }

    const sc = ['#d1c4e9', '#f8bbd0', '#b3e5fc', '#c8e6c9', '#fff9c4'];
    for (let i = 0; i < 28; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        const sz = Math.random() < .5 ? 3 : 5;
        const col = sc[Math.floor(Math.random() * sc.length)];
        s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;top:${Math.random() * 78}%;background:${col};box-shadow:0 0 4px ${col};animation-duration:${Math.random() * 3 + 2}s;animation-delay:-${Math.random() * 5}s;`;
        bg.appendChild(s);
    }

    const spk = ['#b39ddb', '#f48fb1', '#80deea', '#a5d6a7', '#fff176'];
    for (let i = 0; i < 16; i++) {
        const sp = document.createElement('div');
        sp.className = 'spark';
        const col = spk[Math.floor(Math.random() * spk.length)];
        sp.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 80 + 10}%;background:${col};border-radius:2px;box-shadow:0 0 5px ${col};animation-duration:${Math.random() * 6 + 4}s;animation-delay:-${Math.random() * 10}s;`;
        bg.appendChild(sp);
    }
})();

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
        if (e.target === m && m.id !== 'modal-gameover') m.classList.remove('open');
    });
});

const questions = [
    {
        q: "O que a PEDRA derrota?",
        opts: ["Papel e Spock", "Tesoura e Lagarto", "Lagarto e Spock", "Papel e Tesoura"],
        correct: 1
    },
    {
        q: "O que o PAPEL derrota?",
        opts: ["Pedra e Spock", "Tesoura e Lagarto", "Pedra e Lagarto", "Spock e Tesoura"],
        correct: 0
    },
    {
        q: "O que a TESOURA derrota?",
        opts: ["Pedra e Spock", "Papel e Lagarto", "Lagarto e Pedra", "Spock e Papel"],
        correct: 1
    },
    {
        q: "O que o LAGARTO derrota?",
        opts: ["Pedra e Tesoura", "Papel e Spock", "Spock e Pedra", "Tesoura e Papel"],
        correct: 1
    },
    {
        q: "O que o SPOCK derrota?",
        opts: ["Papel e Lagarto", "Tesoura e Lagarto", "Pedra e Tesoura", "Lagarto e Papel"],
        correct: 2
    },
    {
        q: "Quem derrota o Spock?",
        opts: ["Pedra", "Tesoura", "Lagarto", "Papel"],
        correct: 2
    },
    {
        q: "Quem derrota a Tesoura?",
        opts: ["Lagarto", "Spock", "Pedra", "Papel"],
        correct: 1
    },
    {
        q: "Quem derrota o Spock?",
        opts: ["Tesoura", "Pedra", "Lagarto", "Papel"],
        correct: 3
    }
];

let pScore = 0, aScore = 0, draws = 0, busy = false;
let lives = 3;
const history = [];

const moves = {
    rock: { label: 'Pedra', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBM8h0oJ-M-o9aW_XE-JmVA40LbxO0h_yeAOiceCITmVKlJVU9TRMQKyxBFhfk-zCa82FKMA46JwIci2JX75mtskKA5AvVJCXaNQVjUnzBCGG9Ur4JLwIaRAjtWyOP7xAhXG7joqasD_cmQoxAUIlLFPh7IwMe6cnNZloOah0wtfO0dekdSsmmxKtstGdIBDRZIqLaGUl-SQ1tsG7_5lIuU2Da93y-COCuyL7H6JP8pIKdH8Bfmi50QcCwoAMQ1sYxiUEuwJHLypzB', beats: ['scissors', 'lizard'] },
    paper: { label: 'Papel', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmiLP1GuqfYUFGqY-avC3zzdop4Fejd_f1b-BprwB9q_oJiE_5a7FwTAzhRSTzoBla26eGwB6QjSK8bUMGChOIoPd5o2csa1D_ljTwPRVvdpMpliDt7dt7QVcOn5cMUrhsxKkEVPkwjm1URkEZwsYKQCQypzuOOHy1xp7DOP1Vgui8uZZZpH_ntfSZWEa3FcHhq1G7f6lI20om-pY7gc_m355XeS6pqBzusvxgiNWkDlE3_SqFRE0AT56MqTjXkVvy8w5dF8NaANs5', beats: ['rock', 'spock'] },
    scissors: { label: 'Tesoura', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANCAF58cTJ66vgIpjJBrVxMwdFEzeup-mFsjxdaBQtkye9-Gwio4TxJb5bLU6HIzXNnKbl91Dho8Yhr134nrjp8FFuuCoH-LP5Cy8WjBli7vZh6g__HVtve1SoLgISnYfmeVnGMnV7FvBF28XxFvNiFbi0TOoYh7YNqgcN8XIvuADEm2-NzD8zyyVCHWn8py17-7YLDfKgZvp7dXTloEzEXsjNosdIWur2PuqR2J9YEQMw6dWZkHT0gOXfIbINOR3I6-9AlCXwZa82', beats: ['paper', 'lizard'] },
    lizard: { label: 'Lagarto', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA00KKidx77tzqc1bmfHtK_kIlCXXcDKm2k1-TLo-tkntS48xf_Wmo5zHSd8dAtCSfPoISKt4n595WuocPIF9C7RUOn8sULQsw_wWcUhrGPpYKEhQJBHefNVAYHfgsJRUJZNPgFjHPF1Nl-prf0ervrEYJF53WnxcY4_Olk1HUXcoDIl3aSXHSqp9M5X6Eqyxvt-SlRTRezO1kWjiYRyWnvYsho_1eEFI_4_PIlNu3Z9xGb7eTIvIswZffEyGkIlSui29dZixNA4NAi', beats: ['paper', 'spock'] },
    spock: { label: 'Spock', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCIo3DGXjcwGNpInAYd6zG9850yRBnas5kzLsGOd3yFAnjMOgkxjQ5bL0C9BYywSlNQhSFtbK1lwrrWoknwXvOQI49_kWMwyniS5bpFt1YAlZJ1HF51rkaWIJTGkiiVUvp-OY9c6OKMFuIiPNptXvCx2tA7KOAGMZNZIgdY6vdoAJ-gjrMFm1j5-fe5teHy4JPDA5YJA2LVXCSvzKo6K0LlREHo_Ho-VOh9Aj-Car0oTOb1q6UdHPQjPvarNJpbBfhnp8FzVU4W_IS', beats: ['rock', 'scissors'] }
};
const moveKeys = Object.keys(moves);

function updateHearts() {
    for (let i = 1; i <= 3; i++) {
        const h = document.getElementById('h' + i);
        if (i > lives) {
            h.classList.add('lost');
        } else {
            h.classList.remove('lost');
        }
    }
}

function loseLife() {
    if (lives <= 0) return;
    const h = document.getElementById('h' + lives);
    h.classList.add('shake');
    setTimeout(() => {
        h.classList.remove('shake');
        lives--;
        updateHearts();
        if (lives === 0) {
            setTimeout(triggerGameOver, 600);
        }
    }, 400);
}

let currentQuestion = null;

function triggerGameOver() {
    sfxGameOver();
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    document.getElementById('go-question').textContent = currentQuestion.q;
    const answersEl = document.getElementById('go-answers');
    answersEl.innerHTML = '';
    document.getElementById('go-feedback').className = 'answer-feedback';
    document.getElementById('go-feedback').textContent = '';
    document.getElementById('restart-btn').classList.remove('visible');

    currentQuestion.opts.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(idx);
        answersEl.appendChild(btn);
    });

    openModal('modal-gameover');
}

function checkAnswer(idx) {
    const btns = document.querySelectorAll('.answer-btn');
    btns.forEach(b => b.onclick = null);

    const feedback = document.getElementById('go-feedback');
    if (idx === currentQuestion.correct) {
        btns[idx].classList.add('correct');
        feedback.textContent = '✅ Correto! Você pode jogar de novo!';
        feedback.className = 'answer-feedback show ok';
        document.getElementById('restart-btn').classList.add('visible');
        sfxWin();
    } else {
        btns[idx].classList.add('wrong');
        btns[currentQuestion.correct].classList.add('correct');
        feedback.textContent = '❌ Errado! A resposta era: ' + currentQuestion.opts[currentQuestion.correct];
        feedback.className = 'answer-feedback show nope';

        setTimeout(() => {
            const newQ = questions.filter(q => q !== currentQuestion);
            currentQuestion = newQ[Math.floor(Math.random() * newQ.length)];
            document.getElementById('go-question').textContent = currentQuestion.q;
            const answersEl = document.getElementById('go-answers');
            answersEl.innerHTML = '';
            feedback.className = 'answer-feedback';
            currentQuestion.opts.forEach((opt, i) => {
                const b = document.createElement('button');
                b.className = 'answer-btn';
                b.textContent = opt;
                b.onclick = () => checkAnswer(i);
                answersEl.appendChild(b);
            });
        }, 2200);
    }
}

function restartGame() {
    closeModal('modal-gameover');
    lives = 3;
    pScore = 0;
    aScore = 0;
    draws = 0;
    history.length = 0;
    updateHearts();
    updateDetailedScore();
    document.getElementById('player-score').textContent = '0';
    document.getElementById('ai-score').textContent = '0';
    document.getElementById('hist-bubbles').innerHTML = '';
    document.getElementById('arena-status').textContent = 'Escolha seu movimento';
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
    busy = false;
}

function triggerFlash(color) {
    const f = document.getElementById('flash');
    f.style.background = color;
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
}

function spawnConfetti(n = 24) {
    const c = ['#b39ddb', '#f48fb1', '#80deea', '#a5d6a7', '#fff176', '#ce93d8', '#80cbc4'];
    for (let i = 0; i < n; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 15}%;background:${c[i % c.length]};animation-delay:${Math.random() * .4}s;animation-duration:${Math.random() * .7 + .9}s;`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1900);
    }
}

function spawnHearts(x, y) {
    ['💜', '💗', '✨', '⭐', '💖'].forEach((e, i) => {
        const h = document.createElement('div');
        h.className = 'heart-pop';
        h.textContent = e;
        h.style.cssText = `left:${x + Math.random() * 60 - 30}px;top:${y}px;animation-delay:${i * .08}s;`;
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 1200);
    });
}

function popScore(id) {
    const el = document.getElementById(id);
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
}

function addHistory(playerChoice, result) {
    history.unshift({ img: moves[playerChoice].img, result });
    if (history.length > 10) history.pop();
    const hb = document.getElementById('hist-bubbles');
    hb.innerHTML = history.map(h => `<div class="hist-item ${h.result}"><img src="${h.img}" alt=""></div>`).join('');
}

function updateDetailedScore() {
    document.getElementById('rs-player').textContent = pScore;
    document.getElementById('rs-ai').textContent = aScore;
    document.getElementById('rs-draw').textContent = draws;
}

function playMove(playerChoice) {
    if (busy || lives <= 0) return;
    resumeAC();
    sfxClick();
    busy = true;
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

    const aiChoice = moveKeys[Math.floor(Math.random() * moveKeys.length)];
    const status = document.getElementById('arena-status');
    const center = document.getElementById('arena-center');
    const result = document.getElementById('arena-result');
    const badge = document.getElementById('result-badge');

    center.style.opacity = '0';
    center.style.transform = 'scale(.5)';
    status.textContent = 'Calculando...';

    setTimeout(() => {
        document.getElementById('p-bubble').innerHTML = `<img src="${moves[playerChoice].img}" alt="${moves[playerChoice].label}">`;
        document.getElementById('a-bubble').innerHTML = `<img src="${moves[aiChoice].img}" alt="${moves[aiChoice].label}">`;
        result.classList.add('show');

        let word, sub, flashColor, clashIcon, histResult;
        if (playerChoice === aiChoice) {
            word = 'EMPATE!';
            sub = 'Ninguém ganhou dessa vez';
            flashColor = 'rgba(255,241,118,.28)';
            clashIcon = '🤝';
            draws++;
            histResult = 'draw';
            sfxDraw();
            status.textContent = 'Empate!';
        } else if (moves[playerChoice].beats.includes(aiChoice)) {
            word = 'VITÓRIA!';
            sub = `${moves[playerChoice].label} venceu ${moves[aiChoice].label}`;
            flashColor = 'rgba(105,240,174,.28)';
            clashIcon = '⚡';
            pScore++;
            histResult = 'win';
            sfxWin();
            document.getElementById('player-score').textContent = pScore;
            popScore('player-score');
            status.textContent = 'Você venceu!';
        } else {
            word = 'DERROTA!';
            sub = `${moves[aiChoice].label} venceu ${moves[playerChoice].label}`;
            flashColor = 'rgba(255,138,128,.28)';
            clashIcon = '💥';
            aScore++;
            histResult = 'lose';
            sfxLose();
            document.getElementById('ai-score').textContent = aScore;
            popScore('ai-score');
            status.textContent = 'CPU venceu!';
            loseLife();
        }

        document.getElementById('clash-fx').textContent = clashIcon;
        triggerFlash(flashColor);
        updateDetailedScore();
        addHistory(playerChoice, histResult);

        const badgeWord = document.getElementById('badge-word');
        const badgeSub = document.getElementById('badge-sub');
        badgeWord.textContent = word;
        badgeSub.textContent = sub;
        badgeWord.style.color = word === 'VITÓRIA!' ? '#00897b' : word === 'DERROTA!' ? '#e53935' : '#f9a825';
        badge.classList.add('show');

        if (word === 'VITÓRIA!') {
            spawnConfetti(26);
            const arena = document.querySelector('.arena');
            const rect = arena.getBoundingClientRect();
            spawnHearts(rect.left + rect.width / 2, rect.top + 50);
        }

        setTimeout(() => {
            result.classList.remove('show');
            badge.classList.remove('show');
            center.style.opacity = '1';
            center.style.transform = 'scale(1)';
            if (lives > 0) status.textContent = 'Escolha seu movimento';
            document.getElementById('clash-fx').textContent = '⚡';
            if (lives > 0) document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
            busy = false;
        }, 2400);
    }, 380);
}