// The league's rules, for the "Normas" tab, in Spanish and Catalan.
// The points themselves are entered by the scorekeeper; only the extra die
// and the CASA column are applied by the app (see rules.js).

import { dieSvg, escapeHtml } from "./icons.js";
import { EXTRA_DIE_MIN_WATCHERS } from "./rules.js";

const NORMAS = {
  es: {
    title: "Normas <span>de la liga</span>",
    intro: "Cada jornada es un partido del Barça. Así se suman los puntos.",
    generalTitle: "Normas generales",
    general: [
      { pts: "+3", name: "Asistencia al partido", text: "Ver el partido juntos." },
      { pts: "+1", name: "Poner casa", text: "Para quien pone la casa donde se ve el partido. Es la columna CASA de la clasificación." },
      { pts: "+2", name: "Falta por trabajo", text: "Si no puedes venir por trabajo, envía una foto viendo el partido y sumas." },
      { pts: "+2", name: "Jon, Lucas (cuando juega el Madrid) y Joan", text: "Si envían una foto viendo el partido del Barça o del Madrid, suman." },
      { pts: "+3", name: "Plan B: al bar", text: "Si no hay casa y se va al bar a ver el partido, se suman 3 puntos. Hace falta foto." },
    ],
    photosTitle: "Normas de las fotos",
    photos: [
      "Quien vive en Vallirana no puede enviar foto desde su casa para sumar.",
      "Las fotos de vacaciones no suman.",
    ],
    diceTitle: "El dado",
    diceIntro: "En cada partido se tira un dado. La cara que sale decide el bonus de la jornada.",
    dice: [
      { pts: "+1", name: "Confío en ti", text: "Si el Barça remonta el partido." },
      { pts: "+goles", name: "Los goles son amores", text: "Sumas tantos puntos como goles marque el Barça." },
      { pts: "+1", name: "Esto huele a paliza", text: "Si el Barça marca 3 goles o más." },
      { pts: "+1", name: "Que empiece el show", text: "Si el Barça marca antes del minuto 15." },
      {
        pts: "0 / +3", name: "Por el culo te la hinco",
        list: [
          "Si gana el Barça: 0 para los que ven el partido y +3 para los que no.",
          "Si pierde el Barça: +3 para los que ven el partido y 0 para los que no.",
          "Si empata: no suma nadie.",
        ],
      },
      { pts: "+2", name: "La esperanza es lo último que se pierde", text: "Si hay un gol después del minuto 80." },
    ],
    extraTitle: "Dado extra",
    extraText: (n) => `Si sois ${n} o más viendo el partido, el que va último en la liga de los que lo están viendo tira un dado y suma tantos puntos como saque. En la clasificación, la columna DADO EXTRA muestra los dados que ha ganado cada uno, con lo que sacó.`,
    tableTitle: "La clasificación",
    table: [
      ["Puntos", "Todos los puntos de la temporada, dado extra incluido."],
      ["Casa", "Cuántas veces ha puesto casa cada uno."],
      ["Dado extra", "Los dados extra que ha ganado cada uno."],
      ["Dado – veces que ha salido", "Cuántas veces ha salido cada cara del dado. En verde, la del último partido."],
    ],
    motto: "Disfrutamos, sufrimos y sumamos… ¡Visca el Barça!",
  },
  ca: {
    title: "Normes <span>de la lliga</span>",
    intro: "Cada jornada és un partit del Barça. Així se sumen els punts.",
    generalTitle: "Normes generals",
    general: [
      { pts: "+3", name: "Assistència al partit", text: "Mirar el partit junts." },
      { pts: "+1", name: "Posar casa", text: "Per a qui posa la casa on es mira el partit. És la columna CASA de la classificació." },
      { pts: "+2", name: "Falta per feina", text: "Si no pots venir per feina, envia una foto mirant el partit i sumes." },
      { pts: "+2", name: "Jon, Lucas (quan juga el Madrid) i Joan", text: "Si envien una foto mirant el partit del Barça o del Madrid, sumen." },
      { pts: "+3", name: "Pla B: al bar", text: "Si no hi ha casa i anem al bar a mirar el partit, se sumen 3 punts. Cal foto." },
    ],
    photosTitle: "Normes de les fotos",
    photos: [
      "Qui viu a Vallirana no pot enviar foto des de casa seva per sumar.",
      "Les fotos de vacances no sumen.",
    ],
    diceTitle: "El dau",
    diceIntro: "A cada partit es tira un dau. La cara que surt decideix el bonus de la jornada.",
    dice: [
      { pts: "+1", name: "Confio en tu", text: "Si el Barça remunta el partit." },
      { pts: "+gols", name: "Els gols són amors", text: "Sumes tants punts com gols marqui el Barça." },
      { pts: "+1", name: "Això fa olor de pallissa", text: "Si el Barça marca 3 gols o més." },
      { pts: "+1", name: "Que comenci l'espectacle", text: "Si el Barça marca abans del minut 15." },
      {
        pts: "0 / +3", name: "Pel cul te la fico",
        list: [
          "Si guanya el Barça: 0 per als que miren el partit i +3 per als que no.",
          "Si perd el Barça: +3 per als que miren el partit i 0 per als que no.",
          "Si empata: no suma ningú.",
        ],
      },
      { pts: "+2", name: "L'esperança és l'últim que es perd", text: "Si hi ha un gol després del minut 80." },
    ],
    extraTitle: "Dau extra",
    extraText: (n) => `Si sou ${n} o més mirant el partit, qui va últim a la lliga dels que l'estan mirant tira un dau i suma tants punts com tregui. A la classificació, la columna DAU EXTRA mostra els daus que ha guanyat cadascú, amb el que va treure.`,
    tableTitle: "La classificació",
    table: [
      ["Punts", "Tots els punts de la temporada, dau extra inclòs."],
      ["Casa", "Quantes vegades ha posat casa cadascú."],
      ["Dau extra", "Els daus extra que ha guanyat cadascú."],
      ["Dau – vegades que ha sortit", "Quantes vegades ha sortit cada cara del dau. En verd, la de l'últim partit."],
    ],
    motto: "Gaudim, patim i sumem… Visca el Barça!",
  },
};

/** The rules page as HTML, in `lang`. */
export function renderNormas(lang) {
  const n = NORMAS[lang] || NORMAS.es;
  const rule = (r, badge) => `
    <li class="rule">
      ${badge}
      <div class="rule-body">
        <h4>${escapeHtml(r.name)}</h4>
        ${r.text ? `<p>${escapeHtml(r.text)}</p>` : ""}
        ${r.list ? `<ul>${r.list.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
      </div>
      <span class="rule-pts">${escapeHtml(r.pts)}</span>
    </li>`;
  return `
    <article class="normas">
      <h2>${n.title}</h2>
      <p class="hint">${escapeHtml(n.intro)}</p>

      <section class="panel">
        <h3>${escapeHtml(n.generalTitle)}</h3>
        <ol class="rules">${n.general.map((r, i) => rule(r, `<span class="rule-num">${i + 1}</span>`)).join("")}</ol>
      </section>

      <section class="panel">
        <h3>${escapeHtml(n.photosTitle)}</h3>
        <ul class="plain">${n.photos.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </section>

      <section class="panel">
        <h3>${escapeHtml(n.diceTitle)}</h3>
        <p class="hint">${escapeHtml(n.diceIntro)}</p>
        <ol class="rules">${n.dice.map((r, i) => rule(r, dieSvg(i + 1, { style: "white", className: "rule-die" }))).join("")}</ol>
      </section>

      <section class="panel">
        <h3>${escapeHtml(n.extraTitle)}</h3>
        <p class="rule-text">${escapeHtml(n.extraText(EXTRA_DIE_MIN_WATCHERS))}</p>
      </section>

      <section class="panel">
        <h3>${escapeHtml(n.tableTitle)}</h3>
        <dl class="columns">${n.table.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>
      </section>

      <p class="motto">${escapeHtml(n.motto)}</p>
    </article>`;
}
