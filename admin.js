const ADMIN_PASSWORD = "chungus2024";

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function gerarCicloPerfeito(n) {
  const ordem = shuffle([...Array(n).keys()]);
  const perm = Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    const atual = ordem[i];
    const proximo = ordem[(i + 1) % n];
    perm[atual] = proximo;
  }

  return perm;
}

document.addEventListener("DOMContentLoaded", () => {
  const authed = sessionStorage.getItem("secretChungusAdminOK");
  if (!authed) {
    const pwd = prompt("Enter admin password:");
    if (pwd !== ADMIN_PASSWORD) {
      document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:40px;'>Not authorized.</h2>";
      return;
    }
    sessionStorage.setItem("secretChungusAdminOK", "1");
  }

  const btnSortear = document.getElementById("btn-sortear");
  const tbody = document.getElementById("links-body");

  function renderDraw(pairs) {
    tbody.innerHTML = "";
    pairs.forEach((pair) => {
      const giver = PARTICIPANTS.find((p) => p.id === pair.giverId);
      const receiver = PARTICIPANTS.find((p) => p.id === pair.receiverId);

      const tr = document.createElement('tr');
      const tdNome = document.createElement('td');
      const tdLink = document.createElement('td');

      tdNome.textContent = (giver && giver.name) ? giver.name : pair.giverId;

      const participantUrl = new URL('participant.html', window.location.href);
      const payload = { giverId: pair.giverId, receiverId: pair.receiverId };
      const link = `${participantUrl.toString()}?data=${encodeURIComponent(btoa(JSON.stringify(payload)))}`;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = link;
      input.readOnly = true;

      tdLink.appendChild(input);
      tr.appendChild(tdNome);
      tr.appendChild(tdLink);
      tbody.appendChild(tr);
    });
  }

  btnSortear.addEventListener("click", () => {
    const n = PARTICIPANTS.length;
    if (n < 2) {
      alert("Precisa de pelo menos 2 participantes.");
      return;
    }
    const perm = gerarCicloPerfeito(n);
    tbody.innerHTML = "";

    for (let i = 0; i < n; i++) {
      const giver = PARTICIPANTS[i];
      const receiver = PARTICIPANTS[perm[i]];

      const payload = {
        giverId: giver.id,
        receiverId: receiver.id
      };
      if (!window._lastDrawPairs) window._lastDrawPairs = [];
      window._lastDrawPairs.push({ giverId: giver.id, receiverId: receiver.id });
    }

    renderDraw(window._lastDrawPairs);

    try {
      const drawJson = JSON.stringify(window._lastDrawPairs);
      const drawB64 = btoa(drawJson);
      const u = new URL(window.location.href);
      u.searchParams.set('draw', drawB64);
      history.replaceState(null, '', u.toString());
    } catch (e) {
      console.warn('Could not write draw to URL:', e);
    }

    alert("Sorteio feito! O resultado foi salvo na URL (pode salvar/compartilhar). Copie os links abaixo.");
  });

  (function loadDrawFromUrl() {
    try {
      const params = new URL(window.location.href).searchParams;
      const drawB64 = params.get('draw');
      if (!drawB64) return;
      const json = atob(drawB64);
      const pairs = JSON.parse(json);
      if (Array.isArray(pairs) && pairs.length) {
        window._lastDrawPairs = pairs;
        renderDraw(pairs);
        console.log('Loaded draw from URL with', pairs.length, 'pairs');
      }
    } catch (e) {
      console.warn('Failed to load draw from URL:', e);
    }
  })();
});
