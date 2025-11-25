
const SLOT_LOOPS = 150;

let currentStep = 1;


let confettiCanvas = null;
let confettiCtx = null;
let confettiPieces = [];

window.drumPlayer = null;
let drumPlayerReady = false;
let drumButtonTimerStarted = false;
let drumShouldPlayWhenReady = false;
let backgroundMusic = null;

function withBreaks(text) {
  return (text || "").replace(/\n/g, "<br>");
}

function createConfettiPieces() {
  if (!confettiCanvas) return [];
  const colors = ['#fde132', '#009bde', '#ff6b00', '#ff2d5d', '#7cff00'];
  const pieces = [];
  for (let i = 0; i < 100; i++) {
    pieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 2,
      d: Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
      tiltAngle: 0
    });
  }
  return pieces;
}

function drawConfetti() {
  if (!confettiCtx || !confettiCanvas) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces.forEach((p) => {
    confettiCtx.beginPath();
    confettiCtx.lineWidth = p.r;
    confettiCtx.strokeStyle = p.color;
    confettiCtx.moveTo(p.x + p.tilt + (p.r / 2), p.y);
    confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 2));
    confettiCtx.stroke();
  });
}

function updateConfetti() {
  if (!confettiCanvas) return;
  confettiPieces.forEach((p, index) => {
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.x += Math.sin(p.d);
    p.tilt = Math.sin(p.tiltAngle) * 15;

    if (p.y > confettiCanvas.height) {
      confettiPieces[index] = {
        x: Math.random() * confettiCanvas.width,
        y: -20,
        r: p.r,
        d: p.d,
        color: p.color,
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: p.tiltAngleIncremental,
        tiltAngle: p.tiltAngle
      };
    }
  });
}

function startConfetti() {
  if (!confettiCanvas || !confettiCtx) return;

  confettiPieces = createConfettiPieces();
  const duration = 3000; 
  const end = Date.now() + duration;

  function runAnimation() {
    if (Date.now() < end) {
      drawConfetti();
      updateConfetti();
      requestAnimationFrame(runAnimation);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  runAnimation();
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function findParticipantById(id) {
  return PARTICIPANTS.find((p) => p.id === id);
}

function showStep(stepNumber) {
  const cards = document.querySelectorAll(".step-card");
  cards.forEach((card) => {
    const isThisStep = Number(card.dataset.step) === stepNumber;
    card.classList.toggle("active", isThisStep);
  });

  currentStep = stepNumber;

  if (stepNumber === 2) {
    drumShouldPlayWhenReady = true;

    if (drumPlayerReady && drumPlayer && typeof drumPlayer.playVideo === 'function') {
      drumPlayer.unMute();
      drumPlayer.playVideo();
    }
  }

  try {
    if (backgroundMusic) {
      if (stepNumber === 3) {
        const p = backgroundMusic.play();
        if (p && typeof p.catch === 'function') {
          p.catch((err) => {
            console.warn('Playback prevented:', err);
          });
        }
      } else {
        if (!backgroundMusic.paused) backgroundMusic.pause();
        try { backgroundMusic.currentTime = 0; } catch (e) { /* ignore */ }
      }
    }
  } catch (e) {
    console.error('Erro ao controlar backgroundMusic:', e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const containerName = document.getElementById("playerName");
  const namePlaceholders = document.querySelectorAll(".name-placeholder");
  const chungeeNameEl = document.getElementById("chungeeName");
  const wishMessageEl = document.getElementById("wishMessage");
  const favoriteChungusEl = document.getElementById("favoriteChungus");
  const storyTextEl = document.getElementById("storyText");
  const storyImageEl = document.getElementById("storyImage");
  const favoriteChungusImageEl = document.getElementById("favoriteChungusImage");

  // confetti canvas
  confettiCanvas = document.getElementById("confetti-canvas");
  if (confettiCanvas) {
    confettiCtx = confettiCanvas.getContext("2d");

    const resizeCanvas = () => {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }

  try {
    backgroundMusic = new Audio('./images/chungusmassong.ogg');
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'auto';
    backgroundMusic.volume = 0.6;
  } catch (e) {
    console.warn('Não foi possível inicializar backgroundMusic:', e);
    backgroundMusic = null;
  }

  const dataParam = getQueryParam("data");
  if (!dataParam) {
    alert("Invalid link. Ask the person who sent this to check the link.");
    return;
  }

  let payload;

  function base64UrlToBase64(input) {
    try {
      input = decodeURIComponent(input);
    } catch (e) {
      // ignore
    }
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    while (input.length % 4 !== 0) input += '=';
    return input;
  }

  try {
    const raw = dataParam;

    let decodedOnce;
    try {
      decodedOnce = decodeURIComponent(raw);
    } catch (e) {
      decodedOnce = raw;
    }

    const tryVariants = [decodedOnce, raw];

    if (decodedOnce !== raw && decodedOnce.includes('%')) {
      try {
        const doubleDecoded = decodeURIComponent(decodedOnce);
        tryVariants.push(doubleDecoded);
      } catch (e) {
        // ignore
      }
    }

    let lastError = null;
    for (const variant of tryVariants) {
      try {
        const b64 = base64UrlToBase64(variant);
        const jsonStr = atob(b64);
        payload = JSON.parse(jsonStr);
        console.log('Decoded payload using variant:', variant);
        break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!payload) {
      try {
        const jsonStr = atob(decodeURIComponent(dataParam));
        payload = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Erro ao decodificar ?data= — tentativas:', {
          dataParam,
          decodedOnce,
          variantsTried: tryVariants,
          lastError: lastError && lastError.message,
          finalError: e && e.message,
        });
        alert("Error reading your Secret Chungus data :(");
        return;
      }
    }
  } catch (e) {
    console.error('Unexpected error decoding dataParam:', e, dataParam);
    alert("Error reading your Secret Chungus data :(");
    return;
  }

  const giver = findParticipantById(payload.giverId);
  const receiver = findParticipantById(payload.receiverId);

  if (!giver || !receiver) {
    alert("Participant not found. Check with the person who sent you this link.");
    return;
  }

  if (containerName) containerName.textContent = giver.name;
  namePlaceholders.forEach((el) => (el.textContent = giver.name));

  if (storyTextEl) {
    const rawStory = giver.story || "";
    setupScrollReveal(storyTextEl, rawStory);
  }
  if (storyImageEl && giver.storyImage) {
    storyImageEl.src = giver.storyImage;
    storyImageEl.alt = giver.name + " story image";

    const storyImageOverlay = document.getElementById('storyImageOverlay');
    const revealStoryImageButton = document.getElementById('revealStoryImageButton');

    if (storyImageOverlay) {
      storyImageOverlay.classList.remove('hidden');
    }

    storyImageEl.addEventListener('load', () => {
      if (storyImageOverlay) storyImageOverlay.classList.remove('hidden');
    });

    if (revealStoryImageButton && storyImageOverlay) {
      revealStoryImageButton.addEventListener('click', (ev) => {
        ev.stopPropagation();
        storyImageOverlay.classList.add('hidden');
      });
    }
  }

  if (chungeeNameEl) chungeeNameEl.textContent = receiver.name;
  if (wishMessageEl) {
    wishMessageEl.innerHTML = withBreaks(receiver.message || "");
  }
  if (favoriteChungusEl) favoriteChungusEl.textContent = receiver.favoriteChungus || "";

  if (favoriteChungusImageEl && receiver.favoriteChungusImage) {
    favoriteChungusImageEl.src = receiver.favoriteChungusImage;
    favoriteChungusImageEl.alt = (receiver.favoriteChungus || "Favorite Chungus") + " image";
  }

  const chungeeAvatarImg = document.getElementById("chungeeAvatar");
  if (chungeeAvatarImg && receiver.avatar) {
    chungeeAvatarImg.src = receiver.avatar;
    chungeeAvatarImg.alt = receiver.name;
  }

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-next-step]");
    if (!btn) return;

    const nextStep = Number(btn.getAttribute("data-next-step"));

    if (window.drumPlayer && typeof window.drumPlayer.stopVideo === "function") {
      window.drumPlayer.stopVideo();
    }

    showStep(nextStep);

    if (nextStep === 4) {
      startSlotMachine(receiver.id);
    }
  });

  const notMeButton = document.getElementById("notMeButton");
  const morbiusOverlay = document.getElementById("morbiusOverlay");
  const morbiusImage = document.getElementById("morbiusImage");

  const yesButton = document.getElementById("yesImButton");
  const trustPopup = document.getElementById("trustPopup");
  let trustTimeoutId = null;

  if (yesButton && trustPopup) {
    yesButton.addEventListener("click", () => {
      trustPopup.classList.add("visible");

      showStep(1);

      trustTimeoutId = setTimeout(() => {
        trustPopup.classList.remove("visible");
        showStep(2);
      }, 2000);
    });

    trustPopup.addEventListener("click", () => {
      if (trustTimeoutId) {
        clearTimeout(trustTimeoutId);
        trustTimeoutId = null;
      }
      trustPopup.classList.remove("visible");
      showStep(2);
    });
  }

  if (notMeButton && morbiusOverlay && morbiusImage) {
    notMeButton.addEventListener("click", () => {
      morbiusOverlay.classList.remove("hidden");

      if (!morbiusImage.classList.contains("woah")) {
        morbiusImage.classList.add("woah");
      }

      morbiusImage.classList.remove("simpleEntrance");
      void morbiusImage.offsetWidth; // força reflow
      morbiusImage.classList.add("simpleEntrance");
    });

    morbiusOverlay.addEventListener("click", () => {
      morbiusOverlay.classList.add("hidden");
    });
  }

  (function () {
    const amazingImgs = document.querySelectorAll('.amazingsec img');
    const bannerPopupEl = document.getElementById('bannerPopup');
    const bannerPopupImageEl = document.getElementById('bannerPopupImage');
    if (!amazingImgs || !amazingImgs.length || !bannerPopupEl || !bannerPopupImageEl) return;

    if (amazingImgs[0]) {
      amazingImgs[0].style.cursor = 'pointer';
      amazingImgs[0].addEventListener('click', (e) => {
        e.stopPropagation();
        bannerPopupImageEl.src = './images/Sans_overworld.png';
        bannerPopupEl.classList.remove('hidden');
      });
    }

    if (amazingImgs[1]) {
      amazingImgs[1].style.cursor = 'pointer';
      amazingImgs[1].addEventListener('click', (e) => {
        e.stopPropagation();
        bannerPopupImageEl.src = './images/fucking dog.png';
        bannerPopupEl.classList.remove('hidden');
      });
    }
  })();

  setupSlotReels();
});


function setupSlotReels() {
  const slotEl = document.getElementById("slotMachine");
  if (!slotEl) return;

  const reelInners = slotEl.querySelectorAll(".reel-inner");
  if (!reelInners.length) return;

  const faces = PARTICIPANTS.filter((p) => p.avatar);

  try {
    console.log('setupSlotReels: SLOT_LOOPS=', SLOT_LOOPS, 'facesCount=', faces.length, 'expectedPerReel=', faces.length * SLOT_LOOPS);
  } catch (e) { /* ignore */ }

  reelInners.forEach((reel) => {
    reel.innerHTML = "";
    for (let loop = 0; loop < SLOT_LOOPS; loop++) {
      faces.forEach((p) => {
        const img = document.createElement("img");
        img.src = p.avatar;
        img.alt = p.name;
        img.dataset.participantId = p.id;
        img.className = "slot-face";
        reel.appendChild(img);
      });
    }
  });
}

function setupScrollReveal(containerEl, rawText) {
  containerEl.innerHTML = "";

  const lines = rawText.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const span = document.createElement('span');
    span.className = 'reveal-line';

    if (line.trim() === '') {
      span.classList.add('empty-line');
      span.innerHTML = '&nbsp;';
    } else {
      span.textContent = line;
    }

    containerEl.appendChild(span);
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.05,
  });

  const toObserve = containerEl.querySelectorAll('.reveal-line');
  toObserve.forEach((el) => observer.observe(el));
}

function startSlotMachine(receiverId) {
  const slotEl = document.getElementById("slotMachine");
  const revealEl = document.getElementById("slotReveal");
  if (!slotEl) return;

  if (revealEl) {
    revealEl.classList.add("hidden");
    revealEl.classList.remove("show-photo");
  }

  const reelInners = slotEl.querySelectorAll(".reel-inner");
  if (!reelInners.length) return;

  const firstImg = reelInners[0].querySelector(".slot-face");
  if (!firstImg) return;

  const iconHeight = firstImg.clientHeight || 80; // fallback
  const totalImages = reelInners[0].children.length;

  try {
    console.log('startSlotMachine: totalImages=', totalImages, 'iconHeight=', iconHeight, 'facesCount=', facesCount, 'baseIndexInFirstCycle=', baseIndexInFirstCycle);
  } catch (e) { /* ignore */ }

  const allFaces = Array.from(reelInners[0].children);
  const facesCount = PARTICIPANTS.filter((p) => p.avatar).length;

  const baseIndexInFirstCycle = allFaces.findIndex(
    (img) => img.dataset.participantId === receiverId
  );
  if (baseIndexInFirstCycle === -1) return;

  const visibleOffset = 1;

  reelInners.forEach((reel, i) => {
    reel.style.transition = "none";
    reel.style.transform = "translateY(0px)";
    void reel.offsetHeight;

    const extraLoops = 3 + i;
    const indexInDom = baseIndexInFirstCycle + extraLoops * facesCount;

    const maxIndexForCenter = totalImages - 2;
    const safeIndex = Math.min(indexInDom, maxIndexForCenter);

    const offset = -(safeIndex - visibleOffset) * iconHeight;

    const imagesToMove = Math.max(1, Math.abs(safeIndex - visibleOffset));
    const perImageMs = 80; // ms per image scrolled (tweak to taste)
    const baseMs = 1200; // minimum base duration
    const duration = Math.min(30000, baseMs + imagesToMove * perImageMs + i * 600);

    // debug
    try { console.log(`reel ${i}: imagesToMove=${imagesToMove}, duration=${duration}, offset=${offset}`); } catch (e) {}

    reel.style.transition = `transform ${duration}ms cubic-bezier(.41,-0.01,.63,1.09)`;
    setTimeout(() => {
      reel.style.transform = `translateY(${offset}px)`;
    }, i * 200);
  });

  const maxDuration = 3500 + (reelInners.length - 1) * 700 + 1000;
  setTimeout(() => {
    if (revealEl) {
      revealEl.classList.remove("hidden");
      revealEl.classList.add("show-photo");
      startConfetti();
    }
  }, maxDuration);
}


function createSnowflakes() {
  const numFlakes = 50; // quantidade de flocos
  const colors = ['#ffffff', '#d4f1f9', '#e8f8ff'];

  for (let i = 0; i < numFlakes; i++) {
    const flake = document.createElement('div');
    flake.classList.add('snowflake');
    flake.innerHTML = '❄';
    document.body.appendChild(flake);

    const size = Math.random() * 10 + 10 + 'px';
    flake.style.left = Math.random() * 100 + 'vw';
    flake.style.fontSize = size;
    flake.style.color = colors[Math.floor(Math.random() * colors.length)];
    flake.style.animationDuration = Math.random() * 3 + 2 + 's';
    flake.style.animationDelay = Math.random() * 5 + 's';
  }
}

window.addEventListener('load', createSnowflakes);

(function () {
  const banner = document.querySelector('.chungusBanner');
  const bannerPopup = document.getElementById('bannerPopup');
  const bannerPopupImage = document.getElementById('bannerPopupImage');
  const bannerPopupClose = document.getElementById('bannerPopupClose');

  if (!banner || !bannerPopup || !bannerPopupImage || !bannerPopupClose) {
    return;
  }

  const bannerImages = [
    './images/emoji wave.png',
    './images/another slice of pizza.png',
    './images/fish_PNG25137.png'
  ];

  let bannerClickCount = 0;

  function openBannerPopup() {
    if (bannerClickCount >= bannerImages.length) {
      return;
    }

    bannerPopupImage.src = bannerImages[bannerClickCount];
    bannerPopup.classList.remove('hidden');
    bannerClickCount += 1;
  }

  function closeBannerPopup() {
    bannerPopup.classList.add('hidden');
  }

  banner.addEventListener('click', openBannerPopup);
  bannerPopupClose.addEventListener('click', closeBannerPopup);

  bannerPopup.addEventListener('click', function (e) {
    if (e.target === bannerPopup) {
      closeBannerPopup();
    }
  });
})();


(function loadYouTubeAPI() {
  const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if (existing) return;

  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
})();

function onYouTubeIframeAPIReady() {
  const drumContainer = document.getElementById('drumVideo');
  if (!drumContainer) return;

  drumPlayer = new YT.Player('drumVideo', {
    videoId: 'Q0h751kT6zQ', 
    playerVars: {
      autoplay: 0,        
      controls: 0,
      rel: 0,
      modestbranding: 1,
      fs: 0,
      disablekb: 1,
      playsinline: 1,
      iv_load_policy: 3
    },
    events: {
      'onReady': onDrumPlayerReady,
      'onStateChange': onDrumPlayerStateChange
    }
  });
}

function onDrumPlayerReady(event) {
  drumPlayerReady = true;

  if (drumShouldPlayWhenReady && currentStep === 2) {
    event.target.unMute();
    event.target.playVideo();
  }
}

function onDrumPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING && !drumButtonTimerStarted) {
    drumButtonTimerStarted = true;

    setTimeout(() => {
      const btn = document.getElementById('drumNextButton');
      if (btn) {
        btn.classList.remove('hidden');
      }
    }, 5000); 
  }
}
