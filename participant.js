// participant.js

// quantas vezes repetimos a lista de participantes em cada rolo
const SLOT_LOOPS = 8;

// controle de step atual
let currentStep = 1;

// ---------- CONFETTI ----------
let confettiCanvas = null;
let confettiCtx = null;
let confettiPieces = [];

// ---------- DRUM ROLL VIDEO (STEP 2) ----------
window.drumPlayer = null;
let drumPlayerReady = false;
let drumButtonTimerStarted = false;
let drumShouldPlayWhenReady = false;

// helper para quebras de linha
function withBreaks(text) {
  return (text || "").replace(/\n/g, "<br>");
}

// cria peças de confetti
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

    // recicla se sair da tela
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
  const duration = 3000; // 3 segundos
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

  // quando entra no step 2, marca que o vídeo deve tocar
  if (stepNumber === 2) {
    drumShouldPlayWhenReady = true;

    // se o player já estiver pronto, toca agora
    if (drumPlayerReady && drumPlayer && typeof drumPlayer.playVideo === 'function') {
      drumPlayer.unMute();
      drumPlayer.playVideo();
    }
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

  const dataParam = getQueryParam("data");
  if (!dataParam) {
    alert("Invalid link. Ask the person who sent this to check the link.");
    return;
  }

  let payload;

  function base64UrlToBase64(input) {
    // If it's URI encoded (contains %), try to decode once
    try {
      input = decodeURIComponent(input);
    } catch (e) {
      // ignore
    }
    // convert URL-safe base64 to standard base64
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    // pad with '=' to length divisible by 4
    while (input.length % 4 !== 0) input += '=';
    return input;
  }

  // Defensive decoding: try several strategies and log intermediate values
  try {
    const raw = dataParam;

    // Attempt 1: assume it's URL-safe base64 (possibly URI-encoded)
    let decodedOnce;
    try {
      decodedOnce = decodeURIComponent(raw);
    } catch (e) {
      decodedOnce = raw; // leave as-is if decodeURIComponent fails
    }

    const tryVariants = [decodedOnce, raw];

    // Also try double-decoded if nothing works and looks percent-encoded
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
        // if we got here, parsing should succeed
        payload = JSON.parse(jsonStr);
        // log for debugging in case of future issues
        console.log('Decoded payload using variant:', variant);
        break;
      } catch (e) {
        lastError = e;
        // continue trying other variants
      }
    }

    if (!payload) {
      // exhaustive diagnostic attempt: try raw atob without URL-safe conversion
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

  // Preenche textos e imagens individuais
  if (containerName) containerName.textContent = giver.name;
  namePlaceholders.forEach((el) => (el.textContent = giver.name));

  // Step 3: história de NATAL do PRÓPRIO participante (giver)
  if (storyTextEl) {
    storyTextEl.innerHTML = withBreaks(giver.story || "");
  }
  if (storyImageEl && giver.storyImage) {
    storyImageEl.src = giver.storyImage;
    storyImageEl.alt = giver.name + " story image";
  }

  // Step 4: dados de quem ele tirou (receiver)
  if (chungeeNameEl) chungeeNameEl.textContent = receiver.name;
  if (wishMessageEl) {
    // mensagem do chungee com quebras de linha
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

  // Navegação entre steps
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-next-step]");
    if (!btn) return;

    const nextStep = Number(btn.getAttribute("data-next-step"));

    // sempre que avançar de step, para o vídeo de drum roll (se existir)
    if (window.drumPlayer && typeof window.drumPlayer.stopVideo === "function") {
      window.drumPlayer.stopVideo();
    }

    showStep(nextStep);

    // Quando entra no step 4, dispara a slot machine
    if (nextStep === 4) {
      startSlotMachine(receiver.id);
    }
  });

  // Botão "No, I am not" -> jumpscare
  const notMeButton = document.getElementById("notMeButton");
  const morbiusOverlay = document.getElementById("morbiusOverlay");
  const morbiusImage = document.getElementById("morbiusImage");

  // Botão "yes i'm" -> mostra popup, espera Xs e vai para o próximo card
  const yesButton = document.getElementById("yesImButton");
  const trustPopup = document.getElementById("trustPopup");
  let trustTimeoutId = null;

  if (yesButton && trustPopup) {
    yesButton.addEventListener("click", () => {
      // mostra popup com transição
      trustPopup.classList.add("visible");

      // garante que continuamos no step 1 enquanto o popup está na tela
      showStep(1);

      // depois de 2s, some o popup e vai pro step 2
      trustTimeoutId = setTimeout(() => {
        trustPopup.classList.remove("visible");
        showStep(2);
      }, 2000);
    });

    // se clicar no próprio popup/overlay, pula o tempo e já avança
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
      // mostra o overlay
      morbiusOverlay.classList.remove("hidden");

      // garante que tem classe base woah
      if (!morbiusImage.classList.contains("woah")) {
        morbiusImage.classList.add("woah");
      }

      // reseta a animação pra poder disparar toda vez
      morbiusImage.classList.remove("simpleEntrance");
      void morbiusImage.offsetWidth; // força reflow
      morbiusImage.classList.add("simpleEntrance");
    });

    // clicar em qualquer lugar do overlay fecha
    morbiusOverlay.addEventListener("click", () => {
      morbiusOverlay.classList.add("hidden");
    });
  }

  // prepara as imagens da slot
  setupSlotReels();
});

/* ---------- SLOT MACHINE ---------- */

function setupSlotReels() {
  const slotEl = document.getElementById("slotMachine");
  if (!slotEl) return;

  const reelInners = slotEl.querySelectorAll(".reel-inner");
  if (!reelInners.length) return;

  // lista de participantes com avatar
  const faces = PARTICIPANTS.filter((p) => p.avatar);

  reelInners.forEach((reel) => {
    reel.innerHTML = "";
    // Repete a lista várias vezes pra ter altura suficiente
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

function startSlotMachine(receiverId) {
  const slotEl = document.getElementById("slotMachine");
  const revealEl = document.getElementById("slotReveal");
  if (!slotEl) return;

  // esconde o reveal e reseta a transição da foto
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

  // encontre o índice da imagem do receiver no primeiro ciclo
  const allFaces = Array.from(reelInners[0].children);
  const facesCount = PARTICIPANTS.filter((p) => p.avatar).length;

  const baseIndexInFirstCycle = allFaces.findIndex(
    (img) => img.dataset.participantId === receiverId
  );
  if (baseIndexInFirstCycle === -1) return;

  // queremos o receiver no meio: 3 imagens visíveis -> ele fica na posição central
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
    const duration = 3500 + i * 700;

    reel.style.transition = `transform ${duration}ms cubic-bezier(.41,-0.01,.63,1.09)`;
    setTimeout(() => {
      reel.style.transform = `translateY(${offset}px)`;
    }, i * 200);
  });

  const maxDuration = 3500 + (reelInners.length - 1) * 700 + 1000;
  setTimeout(() => {
    if (revealEl) {
      revealEl.classList.remove("hidden");
      // dispara a transição da foto + balão
      revealEl.classList.add("show-photo");
      // confetti caindo quando a foto aparece
      startConfetti();
    }
  }, maxDuration);
}

/* ---------- SNOWFLAKES ---------- */

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

// chama quando a página carregar
window.addEventListener('load', createSnowflakes);

/* --- POPUP DO BANNER (3 CLICKS) --- */
(function () {
  const banner = document.querySelector('.chungusBanner');
  const bannerPopup = document.getElementById('bannerPopup');
  const bannerPopupImage = document.getElementById('bannerPopupImage');
  const bannerPopupClose = document.getElementById('bannerPopupClose');

  if (!banner || !bannerPopup || !bannerPopupImage || !bannerPopupClose) {
    return;
  }

  // imagens em ordem de clique
  const bannerImages = [
    './images/emoji wave.png',
    './images/another slice of pizza.png',
    './images/fish_PNG25137.png'
  ];

  let bannerClickCount = 0;

  function openBannerPopup() {
    if (bannerClickCount >= bannerImages.length) {
      // a partir do 4º clique não faz mais nada
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

  // fechar se clicar fora da imagem
  bannerPopup.addEventListener('click', function (e) {
    if (e.target === bannerPopup) {
      closeBannerPopup();
    }
  });
})();

/* ---------- DRUM ROLL VIDEO (STEP 2) ---------- */

// carrega API do YouTube
(function loadYouTubeAPI() {
  const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if (existing) return;

  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
})();

// callback global exigido pela YouTube IFrame API
function onYouTubeIframeAPIReady() {
  const drumContainer = document.getElementById('drumVideo');
  if (!drumContainer) return;

  drumPlayer = new YT.Player('drumVideo', {
    videoId: 'Q0h751kT6zQ', // ID do vídeo
    playerVars: {
      autoplay: 0,        // NÃO autoplay aqui; só quando step 2 ficar ativo
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

  // se o step 2 já estiver ativo e marcamos que deve tocar, toca agora
  if (drumShouldPlayWhenReady && currentStep === 2) {
    event.target.unMute();
    event.target.playVideo();
  }
}

function onDrumPlayerStateChange(event) {
  // quando começar a tocar pela primeira vez, dispara o timer de 8s (aqui 5s)
  if (event.data === YT.PlayerState.PLAYING && !drumButtonTimerStarted) {
    drumButtonTimerStarted = true;

    setTimeout(() => {
      const btn = document.getElementById('drumNextButton');
      if (btn) {
        btn.classList.remove('hidden');
      }
    }, 5000); // ajusta se quiser outro tempo
  }
}
