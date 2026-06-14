const flagMap = {
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Alemanha: "DE",
  Argelia: "DZ",
  "Arabia Saudita": "SA",
  "Africa do Sul": "ZA",
  Belgica: "BE",
  Bosnia: "BA",
  Brasil: "BR",
  Canada: "CA",
  "Cabo Verde": "CV",
  Colombia: "CO",
  "Coreia do Sul": "KR",
  "Costa do Marfim": "CI",
  Curacao: "CW",
  Croacia: "HR",
  Catar: "QA",
  Equador: "EC",
  Egito: "EG",
  Escocia: "GB-SCT",
  Espanha: "ES",
  "Estados Unidos": "US",
  Franca: "FR",
  Gana: "GH",
  Haiti: "HT",
  Inglaterra: "GB-ENG",
  Ira: "IR",
  Iraque: "IQ",
  Japao: "JP",
  Jordania: "JO",
  Mexico: "MX",
  Marrocos: "MA",
  Noruega: "NO",
  "Nova Zelandia": "NZ",
  Panama: "PA",
  Paraguai: "PY",
  "Paises Baixos": "NL",
  Portugal: "PT",
  "RD Congo": "CD",
  Senegal: "SN",
  Suecia: "SE",
  Suica: "CH",
  Tchequia: "CZ",
  Tunisia: "TN",
  Turquia: "TR",
  Uruguai: "UY",
  Uzbequistao: "UZ",
};

const imageCodeMap = {
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Alemanha: "de",
  Argelia: "dz",
  "Arabia Saudita": "sa",
  "Africa do Sul": "za",
  Belgica: "be",
  Bosnia: "ba",
  Brasil: "br",
  Canada: "ca",
  "Cabo Verde": "cv",
  Colombia: "co",
  "Coreia do Sul": "kr",
  "Costa do Marfim": "ci",
  Curacao: "cw",
  Croacia: "hr",
  Catar: "qa",
  Equador: "ec",
  Egito: "eg",
  Escocia: "gb-sct",
  Espanha: "es",
  "Estados Unidos": "us",
  Franca: "fr",
  Gana: "gh",
  Haiti: "ht",
  Inglaterra: "gb-eng",
  Ira: "ir",
  Iraque: "iq",
  Japao: "jp",
  Jordania: "jo",
  Mexico: "mx",
  Marrocos: "ma",
  Noruega: "no",
  "Nova Zelandia": "nz",
  Panama: "pa",
  Paraguai: "py",
  "Paises Baixos": "nl",
  Portugal: "pt",
  "RD Congo": "cd",
  Senegal: "sn",
  Suecia: "se",
  Suica: "ch",
  Tchequia: "cz",
  Tunisia: "tn",
  Turquia: "tr",
  Uruguai: "uy",
  Uzbequistao: "uz",
};

const confirmedResults = {
  "Mexico|Africa do Sul": [2, 0],
  "Coreia do Sul|Tchequia": [2, 1],
  "Canada|Bosnia": [1, 1],
};

function isoDateFrom(baseDate, dayOffset, hour = 16) {
  const base = new Date(`${baseDate}T16:00:00-03:00`);
  base.setDate(base.getDate() + dayOffset);
  base.setHours(hour, 0, 0, 0);
  return base.toISOString();
}

function team(name) {
  const imageCode = imageCodeMap[name];

  return {
    id: name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    name,
    flag: flagMap[name] || "FIFA",
    crest: imageCode ? `https://flagcdn.com/w80/${imageCode}.png` : null,
  };
}

function buildGroupFixtures() {
  const fixtures = [
    ["A", "2026-06-11T15:00:00-04:00", "Mexico", "Africa do Sul", "Mexico City Stadium"],
    ["A", "2026-06-11T22:00:00-04:00", "Coreia do Sul", "Tchequia", "Estadio Guadalajara"],
    ["B", "2026-06-12T15:00:00-04:00", "Canada", "Bosnia", "Toronto Stadium"],
    ["D", "2026-06-12T21:00:00-04:00", "Estados Unidos", "Paraguai", "Los Angeles Stadium"],
    ["B", "2026-06-13T15:00:00-04:00", "Catar", "Suica", "San Francisco Bay Area Stadium"],
    ["C", "2026-06-13T18:00:00-04:00", "Brasil", "Marrocos", "New York New Jersey Stadium"],
    ["C", "2026-06-13T21:00:00-04:00", "Haiti", "Escocia", "Boston Stadium"],
    ["D", "2026-06-14T00:00:00-04:00", "Australia", "Turquia", "BC Place Vancouver"],
    ["E", "2026-06-14T13:00:00-04:00", "Alemanha", "Curacao", "Houston Stadium"],
    ["F", "2026-06-14T16:00:00-04:00", "Paises Baixos", "Japao", "Dallas Stadium"],
    ["E", "2026-06-14T19:00:00-04:00", "Costa do Marfim", "Equador", "Philadelphia Stadium"],
    ["F", "2026-06-14T22:00:00-04:00", "Suecia", "Tunisia", "Estadio Monterrey"],
    ["H", "2026-06-15T12:00:00-04:00", "Espanha", "Cabo Verde", "Atlanta Stadium"],
    ["G", "2026-06-15T15:00:00-04:00", "Belgica", "Egito", "Seattle Stadium"],
    ["H", "2026-06-15T18:00:00-04:00", "Arabia Saudita", "Uruguai", "Miami Stadium"],
    ["G", "2026-06-15T21:00:00-04:00", "Ira", "Nova Zelandia", "Los Angeles Stadium"],
    ["I", "2026-06-16T15:00:00-04:00", "Franca", "Senegal", "New York New Jersey Stadium"],
    ["I", "2026-06-16T18:00:00-04:00", "Iraque", "Noruega", "Boston Stadium"],
    ["J", "2026-06-16T21:00:00-04:00", "Argentina", "Argelia", "Kansas City Stadium"],
    ["J", "2026-06-17T00:00:00-04:00", "Austria", "Jordania", "San Francisco Bay Area Stadium"],
    ["K", "2026-06-17T13:00:00-04:00", "Portugal", "RD Congo", "Houston Stadium"],
    ["L", "2026-06-17T16:00:00-04:00", "Inglaterra", "Croacia", "Dallas Stadium"],
    ["L", "2026-06-17T19:00:00-04:00", "Gana", "Panama", "Toronto Stadium"],
    ["K", "2026-06-17T22:00:00-04:00", "Uzbequistao", "Colombia", "Mexico City Stadium"],
    ["A", "2026-06-18T12:00:00-04:00", "Tchequia", "Africa do Sul", "Atlanta Stadium"],
    ["B", "2026-06-18T15:00:00-04:00", "Suica", "Bosnia", "Los Angeles Stadium"],
    ["B", "2026-06-18T18:00:00-04:00", "Canada", "Catar", "BC Place Vancouver"],
    ["A", "2026-06-18T21:00:00-04:00", "Mexico", "Coreia do Sul", "Estadio Guadalajara"],
    ["D", "2026-06-19T15:00:00-04:00", "Estados Unidos", "Australia", "Seattle Stadium"],
    ["C", "2026-06-19T18:00:00-04:00", "Escocia", "Marrocos", "Boston Stadium"],
    ["C", "2026-06-19T20:30:00-04:00", "Brasil", "Haiti", "Philadelphia Stadium"],
    ["D", "2026-06-19T23:00:00-04:00", "Turquia", "Paraguai", "San Francisco Bay Area Stadium"],
    ["F", "2026-06-20T13:00:00-04:00", "Paises Baixos", "Suecia", "Houston Stadium"],
    ["E", "2026-06-20T16:00:00-04:00", "Alemanha", "Costa do Marfim", "Toronto Stadium"],
    ["E", "2026-06-20T20:00:00-04:00", "Equador", "Curacao", "Kansas City Stadium"],
    ["F", "2026-06-21T00:00:00-04:00", "Tunisia", "Japao", "Estadio Monterrey"],
    ["H", "2026-06-21T12:00:00-04:00", "Espanha", "Arabia Saudita", "Atlanta Stadium"],
    ["G", "2026-06-21T15:00:00-04:00", "Belgica", "Ira", "Los Angeles Stadium"],
    ["H", "2026-06-21T18:00:00-04:00", "Uruguai", "Cabo Verde", "Miami Stadium"],
    ["G", "2026-06-21T21:00:00-04:00", "Nova Zelandia", "Egito", "BC Place Vancouver"],
    ["J", "2026-06-22T13:00:00-04:00", "Argentina", "Austria", "Kansas City Stadium"],
    ["I", "2026-06-22T17:00:00-04:00", "Franca", "Iraque", "Boston Stadium"],
    ["I", "2026-06-22T20:00:00-04:00", "Noruega", "Senegal", "New York New Jersey Stadium"],
    ["J", "2026-06-22T23:00:00-04:00", "Jordania", "Argelia", "San Francisco Bay Area Stadium"],
    ["K", "2026-06-23T13:00:00-04:00", "Portugal", "Uzbequistao", "Houston Stadium"],
    ["L", "2026-06-23T16:00:00-04:00", "Inglaterra", "Gana", "Dallas Stadium"],
    ["L", "2026-06-23T19:00:00-04:00", "Panama", "Croacia", "Toronto Stadium"],
    ["K", "2026-06-23T22:00:00-04:00", "Colombia", "RD Congo", "Mexico City Stadium"],
    ["B", "2026-06-24T15:00:00-04:00", "Bosnia", "Catar", "Seattle Stadium"],
    ["B", "2026-06-24T15:00:00-04:00", "Suica", "Canada", "Vancouver Stadium"],
    ["C", "2026-06-24T18:00:00-04:00", "Marrocos", "Haiti", "Miami Stadium"],
    ["C", "2026-06-24T18:00:00-04:00", "Escocia", "Brasil", "Philadelphia Stadium"],
    ["A", "2026-06-24T21:00:00-04:00", "Tchequia", "Mexico", "Houston Stadium"],
    ["A", "2026-06-24T21:00:00-04:00", "Africa do Sul", "Coreia do Sul", "Dallas Stadium"],
    ["E", "2026-06-25T16:00:00-04:00", "Curacao", "Costa do Marfim", "New York New Jersey Stadium"],
    ["E", "2026-06-25T16:00:00-04:00", "Equador", "Alemanha", "Kansas City Stadium"],
    ["F", "2026-06-25T19:00:00-04:00", "Japao", "Suecia", "Los Angeles Stadium"],
    ["F", "2026-06-25T19:00:00-04:00", "Tunisia", "Paises Baixos", "San Francisco Bay Area Stadium"],
    ["D", "2026-06-25T22:00:00-04:00", "Paraguai", "Australia", "Vancouver Stadium"],
    ["D", "2026-06-25T22:00:00-04:00", "Turquia", "Estados Unidos", "Seattle Stadium"],
    ["I", "2026-06-26T15:00:00-04:00", "Noruega", "Franca", "Boston Stadium"],
    ["I", "2026-06-26T15:00:00-04:00", "Senegal", "Iraque", "Philadelphia Stadium"],
    ["H", "2026-06-26T20:00:00-04:00", "Cabo Verde", "Arabia Saudita", "Atlanta Stadium"],
    ["H", "2026-06-26T20:00:00-04:00", "Uruguai", "Espanha", "Miami Stadium"],
    ["G", "2026-06-26T23:00:00-04:00", "Egito", "Ira", "Los Angeles Stadium"],
    ["G", "2026-06-26T23:00:00-04:00", "Nova Zelandia", "Belgica", "Vancouver Stadium"],
    ["L", "2026-06-27T17:00:00-04:00", "Croacia", "Gana", "Toronto Stadium"],
    ["L", "2026-06-27T17:00:00-04:00", "Panama", "Inglaterra", "Dallas Stadium"],
    ["K", "2026-06-27T19:30:00-04:00", "Colombia", "Portugal", "Mexico City Stadium"],
    ["K", "2026-06-27T19:30:00-04:00", "RD Congo", "Uzbequistao", "Houston Stadium"],
    ["J", "2026-06-27T22:00:00-04:00", "Argelia", "Austria", "Kansas City Stadium"],
    ["J", "2026-06-27T22:00:00-04:00", "Jordania", "Argentina", "San Francisco Bay Area Stadium"],
  ];

  return fixtures.map(([group, kickoff, homeName, awayName, venue], index) => {
    const result = confirmedResults[`${homeName}|${awayName}`] || null;
    const status = result ? "FINISHED" : "SCHEDULED";
    const home = team(homeName);
    const away = team(awayName);

    return {
      id: `group-${group}-${index + 1}`,
      apiId: null,
      group,
      round: index + 1,
      phase: "Fase de grupos",
      stageType: "GROUP",
      venue,
      kickoff,
      status,
      home,
      away,
      homeScore: result?.[0] ?? null,
      awayScore: result?.[1] ?? null,
      winner: result && result[0] !== result[1]
        ? result[0] > result[1]
          ? home.id
          : away.id
        : null,
      classificationMethod: result ? "NORMAL_TIME" : null,
    };
  });
}

function buildKnockoutFixtures() {
  const rounds = [
    { key: "r32", label: "16 avos de final", count: 16, baseDate: "2026-06-28", days: 6 },
    { key: "r16", label: "Oitavas de final", count: 8, baseDate: "2026-07-04", days: 4 },
    { key: "qf", label: "Quartas de final", count: 4, baseDate: "2026-07-09", days: 3 },
    { key: "sf", label: "Semifinal", count: 2, baseDate: "2026-07-14", days: 2 },
    { key: "third", label: "Disputa de terceiro", count: 1, baseDate: "2026-07-18", days: 1 },
    { key: "final", label: "Final", count: 1, baseDate: "2026-07-19", days: 1 },
  ];

  return rounds.flatMap((round) =>
    Array.from({ length: round.count }, (_, index) => {
      const home = team(`${round.label} ${index + 1} - Time A`);
      const away = team(`${round.label} ${index + 1} - Time B`);
      const dayOffset = Math.floor((index * round.days) / round.count);
      return {
        id: `${round.key}-${index + 1}`,
        apiId: null,
        group: null,
        round: index + 1,
        phase: round.label,
        stageType: "KNOCKOUT",
        venue: ["New York", "Miami", "Atlanta", "Vancouver"][index % 4],
        kickoff: isoDateFrom(round.baseDate, dayOffset, [13, 16, 19, 22][index % 4]),
        status: "SCHEDULED",
        home,
        away,
        homeScore: null,
        awayScore: null,
        winner: null,
        classificationMethod: null,
      };
    }),
  );
}

export const MOCK_FIXTURES = [...buildGroupFixtures(), ...buildKnockoutFixtures()];
