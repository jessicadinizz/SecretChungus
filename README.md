# Secret Chungus 🎄🐰

A cursed-but-wholesome Secret Santa web toy starring one (1) very big rabbit.

---

## What is this?

Secret Chungus is:

- 10% Secret Santa
- 90% inside jokes, chaos and questionable design choices
- 100% static HTML/CSS/JS

You get:

- An **admin page** that shuffles everyone and spits out secret links.
- A **participant page** that:
  - confirms the person’s name,
  - plays a dramatic drum-roll video,
  - shows a custom Christmas story,
  - spins a slot machine full of avatars,
  - reveals their “chungee” with confetti and silly UI.

If this sounds too serious, don’t worry: it absolutely isn’t.

---

## Folder tour (a.k.a. what all these files do)

- `admin.html`  
  The cursed control panel. You open this, click a button, and suddenly everyone has a secret link.

- `admin.js`  
  - Asks for a password (`ADMIN_PASSWORD`) via `prompt()` like it’s 2005.  
  - Shuffles the `PARTICIPANTS` into a **perfect circle**:  
    `A → B → C → … → A`  
  - For each person, creates a JSON `{ giverId, receiverId }`, base64-encodes it, and appends it to `participant.html?data=...`.

- `participant.html`  
  The “experience”:
  - Step 1: “are you really you?” + possible jumpscare.  
  - Step 2: drum-roll YouTube embed.  
  - Step 3: personal Christmas story.  
  - Step 4: slot machine reveal + confetti + message + favorite Chungus.

- `participant.js`  
  - Decodes the `data` param from the URL.  
  - Looks up `giver` and `receiver` in `PARTICIPANTS`.  
  - Fills in name, story, message, images.  
  - Controls steps, drum-roll timing, slot-machine animation, and confetti.

- `config.js`  
  The soul of the project. Contains:

  ```js
  const PARTICIPANTS = [
    {
      id,
      name,
      message,
      story,
      storyImage,
      favoriteChungus,
      favoriteChungusImage,
      avatar
    },
    // ...
  ];

Edit this file to change everything: names, stories, avatars, favorite chunguses, etc.

* `style.css`
  Makes everything look festive instead of like a debugging prototype.

* `images/`
  Banners, avatars, balloons, emojis, cursed Morbius assets, etc.

---

## Tiny lore dump 🎅

Legend says that once a year, the Secret Chungus awakens, reads `config.js`, and silently judges everyone’s wishlist.

If the array is valid, it forms a perfect giving circle:
no one gets themselves, everyone is someone’s chungee, and at least one person will absolutely receive something they’re not ready to explain to their family.

Meanwhile, a lonely PNG pufferfish watches the slot machine spins from the `images/` folder, waiting for confetti to rain so it can finally rest until next Christmas.

---

## How to run this thing

This is a static site. No build, no backend, just vibes.

### Option 1 – caveman mode

Double-click `admin.html` or `participant.html` and open directly in your browser.
It usually works, but some browsers get grumpy with local file URLs + YouTube + query params.

### Option 2 – tiny local server (recommended)

From the project folder:

```bash
# Python 3
python -m http.server 8000

# then open:
#   http://localhost:8000/admin.html
#   http://localhost:8000/participant.html
```

Or use any static server (`npx serve`, `http-server`, etc.).

---

## How to actually use it

1. **Edit the cast**

   Open `config.js` and tweak `PARTICIPANTS`:

   * `id`: a unique string, used in links.
   * `name`: what shows up on screen.
   * `message`: their Christmas message.
   * `story`: their personal story (can include HTML `<br>` if you want line breaks).
   * `storyImage`, `favoriteChungusImage`, `avatar`: paths into `images/`.

2. **Run the draw**

   * Open `admin.html`.

   * It will ask for a password. Default in `admin.js` is:

     ```js
     const ADMIN_PASSWORD = "chungus2024";
     ```

   * Type it correctly (first try, ideally).

   * Click **“Sortear agora”**.

   * A table appears with:

     * Person’s name.
     * A secret link with `?data=...`.

3. **Send the links**

   * Copy each link.
   * DM it to the corresponding participant.
   * Resist the urge to open other people’s links. (Or don’t. I’m not your boss.)

4. **Participant flow**

   When someone opens their link:

   1. Step 1: “Are you really [name]?”

      * Yes → trust popup → goes to step 2.
      * No → Morbius jumpscare.

   2. Step 2: drum-roll video plays; after a few seconds, a button appears.

   3. Step 3: their **own** Christmas story and story image.

   4. Step 4: slot machine spins; their assigned chungee is revealed with:

      * avatar,
      * favorite chungus,
      * their message,
      * confetti.

---

## Important-but-still-silly notes

* The draw is done entirely in the browser.
* Links embed `{ giverId, receiverId }` as base64 in the URL.
* Anyone who knows how `atob` works can decode it.
* Conclusion: this is for parties, not for nuclear launch codes.

If you don’t want a hard-coded password:

* Change or remove `ADMIN_PASSWORD` in `admin.js`.
* Or move all of this behind a real backend with proper auth (massive overkill, but possible).

---

## Things you *could* add (if you’re too invested now)

* A “sent” checkbox on the admin table to track who already got their link.
* Another reveal mode (e.g. fade-in grid, card flip, etc.).
* Extra steps like:

  * a quiz about your chungee,
  * bonus memes unlocked after the reveal,
  * a “reroll” button that **does nothing** but panic people.

---

## Final disclaimer

This project runs on:

* HTML
* CSS
* Vanilla JS
* Pure holiday chaos

Use it to spread joy, not to store anything sensitive.
May your draws be fair, your links unspoiled, and your Chungus extremely large.
