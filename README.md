# 🚛 Leh Chalo Ustaad

**Truck ki seat se Manali → Leh.** A fun, interactive road trip in your browser: drive a hand-painted Indian truck 474 km through the Himalayas, blast Ustaad's 90s cassette, honk the pressure horn, eat inflation-priced Maggi at dhabas, and design your own truck art.

> धीरे चलो, पहाड़ जल्दी में नहीं है.

**▶ Live:** `https://leh-chalo-ustaad.pages.dev` *(replace with your link)*


**Made by Flux** · [GitHub @ashutoshpandey15](https://github.com/ashutoshpandey15) · [Instagram @ashutosh.pandey_15](https://www.instagram.com/ashutosh.pandey_15/)

=======

---

## ✨ Features

- **Drive the real route:** 21 stops from Manali to Leh: Atal Tunnel, Sarchu, Gata Loops, Tanglang La (5,328 m) and more, with altitude, oxygen level and km left.
- **Real photo backdrops:** 15 photos of the actual route fade in as you reach each place, tinted for dawn, sunset and starry nights. Switch to the hand-drawn **Art View** anytime.
- **Day → night → day:** the clock runs from 6 AM in Manali to the next afternoon in Leh, with snowfall on the high passes.
- **Ustaad ki Cassette:** two playlists (Side A & Side B, 89 songs of 90s Bollywood) playing from YouTube.
- **Make your own playlist:** mix songs from both sides, name it, and share it with friends as a link.
- **Apna gaana:** paste any Spotify or YouTube playlist link, or connect Spotify.
- **Pressure horn:** a real lorry horn (hold **H**), a musical tune horn, headlights, disco lights and LED underglow.
- **Truck Sajao:** paint the back of your truck with classic slogans ("Buri Nazar Wale Tera Muh Kala", "Horn OK Please", "Phir Milenge"…) and download it as an image.
- **Dhaba menus:** Maggi gets pricier the higher you climb. ₹40 in Manali, ₹140 at Lachulung La.
- **Oncoming traffic:** Bullet bikers, army convoys and decorated trucks with their own slogans.
- **Leh arrival screen:** your horn count, Maggi count and songs heard, ready to share.
- **Works on phones:** built mobile-first, with touch-friendly controls.

## ⌨️ Controls

| Key | Action | Key | Action |
|---|---|---|---|
| `H` (hold) | Horn | `T` | Tune horn |
| `L` | Lights | `D` | Disco lights |
| `E` | Engine on/off | `↑` `↓` | Speed |
| `Space` | Play / pause | `N` / `P` | Next / previous song |
| `C` | Truck Sajao | `M` | Paste your own link |
| `Y` | New playlist | `W` | Wallpapers |
| `B` | Photo / Art view | | |

## 🚀 Run locally

There's no build step: it's plain HTML, CSS and JavaScript. It needs a local web server, because YouTube won't play when `index.html` is opened directly.

```bash
python .claude/dev_server.py 5173
```

If the `.claude` helper isn't there, this works too:

```bash
python -m http.server 5173
```

Then open **http://127.0.0.1:5173/**.

## 🗂️ Project structure

```
index.html            Page layout
css/style.css         All styles
js/
  config.js           Site settings (Spotify Client ID)
  songs.js            Side A & Side B playlists
  data.js             Route stops, dhaba menus, dialogues, slogans, photo credits
  scene.js            The animated road, truck, traffic and backdrop (canvas)
  audio.js            Horn, engine and chime sounds
  music.js            Music player, custom playlists, share links, Spotify
  customizer.js       Truck Sajao (truck-art maker)
  app.js              Wires everything together
assets/
  horn.mp3            Lorry horn
  route/              Route backdrop photos
  wallpapers/         Truck photos (intro + gallery)
```

## 🛠️ Customise

- **Add or remove songs:** edit `js/songs.js`. Each song is a YouTube video ID, a title and an artist.
- **Change stops, jokes, menus or slogans:** edit `js/data.js`.
- **Turn on Spotify login:** follow the steps at the top of `js/config.js`. Without it, visitors can still paste Spotify or YouTube links.

## 🌐 Deploy (free)

It's a static site, so any static host works. **Cloudflare Pages** is recommended for its unlimited free bandwidth:

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, and pick this repo.
3. Framework preset: **None** · Build command: *(empty)* · Output directory: **/**
4. Deploy. Every `git push` to `main` updates the live site.

Vercel, Netlify and GitHub Pages work the same way, with no build command and the root folder as output.

## 📷 Credits

**Music:** songs stream from YouTube via the official YouTube player. No audio is hosted in this repo. All songs belong to their respective labels and artists.

**Photos** from [Wikimedia Commons](https://commons.wikimedia.org), used under Creative Commons licences:

| Photo | Photographer | Licence |
|---|---|---|
| [Manali](https://commons.wikimedia.org/wiki/File:Landscape_of_Manali,_India,_2016.jpg) | Anuj.bhargava7 | CC BY-SA 4.0 |
| [Solang Valley](https://commons.wikimedia.org/wiki/File:Solang_Valley_,Manali,_Himachal_Pardes,_India.JPG) | Harvinder Chandigarh | CC BY-SA 4.0 |
| [Sissu, Lahaul](https://commons.wikimedia.org/wiki/File:Wildflowers_Mountains_Sissu_Lahaul_Jul19_D72_10447.jpg) | Timothy A. Gonsalves | CC BY-SA 4.0 |
| [Keylong](https://commons.wikimedia.org/wiki/File:View_from_Shashur_Monastery_,_Keylong.jpg) | Navneet Sharma | CC BY-SA 4.0 |
| [Jispa](https://commons.wikimedia.org/wiki/File:Bhaga_Jispa_Upstream_Lahaul_Himachal_Oct20_D72_18317.jpg) | Timothy A. Gonsalves | CC BY-SA 4.0 |
| [Zing Zing Bar](https://commons.wikimedia.org/wiki/File:Zing_Zing_Bar_(28499499482).jpg) | Ashwin Kumar | CC BY-SA 2.0 |
| [Baralacha La](https://commons.wikimedia.org/wiki/File:Baralacha_La_Lahaul_D32_13255.jpg) | Tagooty | CC BY-SA 4.0 |
| [Near Sarchu](https://commons.wikimedia.org/wiki/File:Near_Sarchu,_Jammu_and_Kashmir_(3803874470).jpg) | Kiran Jonnalagadda | CC BY-SA 2.0 |
| [Gata Loops](https://commons.wikimedia.org/wiki/File:River_Tsarap_From_The_Gata_Loops.jpg) | Soumen Gomes | CC BY-SA 4.0 |
| [Lachulung La](https://commons.wikimedia.org/wiki/File:Lachulungla.JPG) | GerthMichael | CC BY-SA 3.0 |
| [Near Pang](https://commons.wikimedia.org/wiki/File:Desert_View_Near_Pang_Ladakh-3.jpg) | Lalitgupta isgec | CC BY-SA 4.0 |
| [More Plains](https://commons.wikimedia.org/wiki/File:Pang_Tanglangla_Highway_02.jpg) | CA Anand V Kaku | CC BY-SA 4.0 |
| [Tanglang La](https://commons.wikimedia.org/wiki/File:Tanglang_La.jpg) | Wolfgang Maehr | CC BY 2.0 |
| [Rumtse–Upshi](https://commons.wikimedia.org/wiki/File:Sharp_Structures_on_hills_Leh.jpg) | Lalitgupta isgec | CC BY-SA 4.0 |
| [Leh Town](https://commons.wikimedia.org/wiki/File:Leh_Town.jpg) | Arkadeepmeta | CC BY-SA 4.0 |
| [Decorated truck, India](https://commons.wikimedia.org/wiki/File:Decorated_truck,_India,_2013-03_(11551081253).jpg) | Edmund Gall | CC BY-SA 2.0 |
| [Decorated truck](https://commons.wikimedia.org/wiki/File:Decorated_truck_(4180258762).jpg) | Justin Morgan | CC BY-SA 2.0 |
| [Decorated truck in India](https://commons.wikimedia.org/wiki/File:Decorated_truck_in_India.jpg) | Derek Blackadder | CC BY-SA 2.0 |
| [Truck in Rangpo, Sikkim](https://commons.wikimedia.org/wiki/File:Truck_in_Rangpo,_Sikkim.jpg) | Bernard Gagnon | CC BY-SA 4.0 |
| [Horn OK sign](https://commons.wikimedia.org/wiki/File:Horn_Ok_sign_on_a_Bangalore_truck.jpg) | Subhashish Panigrahi | CC BY-SA 3.0 |
| [Blow Horn](https://commons.wikimedia.org/wiki/File:Blow_Horn_(4189256708).jpg) | Justin Morgan | CC BY-SA 2.0 |
| [Manali–Leh Highway](https://commons.wikimedia.org/wiki/File:Manali-Leh_Highway.jpg) | Narender9 | CC BY-SA 4.0 |

The photos were resized and compressed for the web. The truck, road, mountains and all other artwork are hand-drawn in code.

---


Made with ❤️ by **Flux** ([@ashutoshpandey15](https://github.com/ashutoshpandey15) · [@ashutosh.pandey_15](https://www.instagram.com/ashutosh.pandey_15/)) for every ustaad on the highway. **Horn OK Please.** 🚛
=======
Made with ❤️ for every ustaad on the highway. **Horn OK Please.** 🚛

