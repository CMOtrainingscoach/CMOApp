import "server-only";

/** Portrait crops via Unsplash (allowed in next.config.ts). Replace with cmo-public URLs when you upload licensed headshots. */
const IMG = {
  p1: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces",
  p2: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces",
  p3: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=128&h=128&fit=crop&crop=faces",
  p4: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=128&h=128&fit=crop&crop=faces",
  p5: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a3?w=128&h=128&fit=crop&crop=faces",
  p6: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces",
  p7: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=128&h=128&fit=crop&crop=faces",
  p8: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces",
  p9: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=faces",
  p10: "https://images.unsplash.com/photo-1599566150163-90194c98d646?w=128&h=128&fit=crop&crop=faces",
  p11: "https://images.unsplash.com/photo-1601455763557-db1bea8a9a5f?w=128&h=128&fit=crop&crop=faces",
  p12: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
  p13: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=128&h=128&fit=crop&crop=faces",
  p14: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=faces",
  p15: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=faces",
} as const;

import type { LifestyleSceneId } from "@/lib/lifestyle/scene-match-constants";

export type LifestyleSceneBankEntry = {
  id: string;
  person: string;
  knownFor: string;
  /** Optional headshot; displayed on person cards only. */
  imageUrl?: string;
};

/** Re-export for server modules that already import the bank. */
export type { LifestyleSceneId } from "@/lib/lifestyle/scene-match-constants";

/** Belgium-linked business operators, founders, and executives (public reputations). */
export const BELGIUM_SCENE_BANK: LifestyleSceneBankEntry[] = [
  {
    id: "marc-coucke",
    person: "Marc Coucke",
    knownFor: "Serial entrepreneur behind Omega Pharma and high-profile sports-club investments",
    imageUrl: IMG.p1,
  },
  {
    id: "thomas-leysen",
    person: "Thomas Leysen",
    knownFor: "Industrial and media investor; long-time chair of Belgium’s Mediahuis group",
    imageUrl: IMG.p2,
  },
  {
    id: "francoise-chombar",
    person: "Françoise Chombar",
    knownFor: "Led Melexis as CEO — automotive and sensor semiconductors out of Ieper",
    imageUrl: IMG.p6,
  },
  {
    id: "dries-van-noten",
    person: "Dries Van Noten",
    knownFor: "Founder-designer of an Antwerp-based global luxury fashion house",
    imageUrl: IMG.p4,
  },
  {
    id: "jan-callewaert",
    person: "Jan Callewaert",
    knownFor: "Founded Option N.V., a pioneer in wireless IoT modules",
    imageUrl: IMG.p7,
  },
  {
    id: "jurgen-ingels",
    person: "Jurgen Ingels",
    knownFor: "Belgian tech investor and founder of Sweetspot; early-stage B2B SaaS",
    imageUrl: IMG.p3,
  },
  {
    id: "jean-stephenne",
    person: "Jean Stéphenne",
    knownFor: "Biologics leader; helped scale GSK Biologicals in Belgium",
    imageUrl: IMG.p11,
  },
  {
    id: "patrick-de-maeseneire",
    person: "Patrick De Maeseneire",
    knownFor: "Former Jacobs Holding CEO; chaired Barry Callebaut",
    imageUrl: IMG.p5,
  },
  {
    id: "herman-daems",
    person: "Herman Daems",
    knownFor: "Independent director and governance anchor on major Belgian listed boards",
    imageUrl: IMG.p14,
  },
  {
    id: "arnaud-feist",
    person: "Arnaud Feist",
    knownFor: "Former CEO of Brussels Airport Company during BRU’s passenger growth years",
    imageUrl: IMG.p10,
  },
  {
    id: "chris-burggraeve",
    person: "Chris Burggraeve",
    knownFor: "Former AB InBev global CMO; later investing in consumer brands",
    imageUrl: IMG.p1,
  },
  {
    id: "johan-thijs",
    person: "Johan Thijs",
    knownFor: "Former Group CEO of KBC, Belgium’s largest banking-insurance group",
    imageUrl: IMG.p2,
  },
  {
    id: "dominique-leroy",
    person: "Dominique Leroy",
    knownFor: "Former Proximus CEO; telco executive with Benelux retail footprint",
    imageUrl: IMG.p12,
  },
  {
    id: "jan-de-nul",
    person: "Jan De Nul",
    knownFor: "Leads the family dredging and offshore energy contractor bearing his name",
    imageUrl: IMG.p13,
  },
  {
    id: "benoit-van-den-hove",
    person: "Benoît van den Hove",
    knownFor: "Led imec’s U.S. bridge — Flemish chip R&D with American partners",
    imageUrl: IMG.p3,
  },
];

/** Global business figures often cited in European executive education (not Belgium-specific). */
export const INTERNATIONAL_SCENE_BANK: LifestyleSceneBankEntry[] = [
  {
    id: "jamie-dimon",
    person: "Jamie Dimon",
    knownFor: "Chair and CEO of JPMorgan Chase since 2006",
    imageUrl: IMG.p1,
  },
  {
    id: "mary-barra",
    person: "Mary Barra",
    knownFor: "Chair and CEO pushing GM’s EV pivot",
    imageUrl: IMG.p6,
  },
  {
    id: "satya-nadella",
    person: "Satya Nadella",
    knownFor: "Microsoft CEO who scaled Azure and copilots",
    imageUrl: IMG.p7,
  },
  {
    id: "tim-cook",
    person: "Tim Cook",
    knownFor: "Apple CEO; supply-chain discipline and services growth",
    imageUrl: IMG.p4,
  },
  {
    id: "jensen-huang",
    person: "Jensen Huang",
    knownFor: "Nvidia co-founder and face of the AI accelerator boom",
    imageUrl: IMG.p9,
  },
  {
    id: "warren-buffett",
    person: "Warren Buffett",
    knownFor: "Berkshire Hathaway chair — value investing and operating conglomerates",
    imageUrl: IMG.p11,
  },
  {
    id: "bernard-arnault",
    person: "Bernard Arnault",
    knownFor: "Chair of LVMH — luxury goods and brand portfolio architect",
    imageUrl: IMG.p5,
  },
  {
    id: "indra-nooyi",
    person: "Indra Nooyi",
    knownFor: "Former PepsiCo CEO — portfolio rebalancing toward “better for you”",
    imageUrl: IMG.p15,
  },
  {
    id: "reed-hastings",
    person: "Reed Hastings",
    knownFor: "Netflix co-founder; championed streaming over DVD",
    imageUrl: IMG.p3,
  },
  {
    id: "brian-chesky",
    person: "Brian Chesky",
    knownFor: "Airbnb CEO — marketplace design and hospitality brand",
    imageUrl: IMG.p10,
  },
  {
    id: "daniel-ek",
    person: "Daniel Ek",
    knownFor: "Spotify co-founder and CEO — music subscription economics",
    imageUrl: IMG.p14,
  },
  {
    id: "ruth-porat",
    person: "Ruth Porat",
    knownFor: "Alphabet president; ex-Morgan Stanley CFO known for capital discipline",
    imageUrl: IMG.p8,
  },
  {
    id: "christine-lagarde",
    person: "Christine Lagarde",
    knownFor: "ECB president; former IMF managing director",
    imageUrl: IMG.p12,
  },
  {
    id: "larry-fink",
    person: "Larry Fink",
    knownFor: "BlackRock CEO; steward of passive investing and climate disclosure letters",
    imageUrl: IMG.p13,
  },
  {
    id: "safra-catz",
    person: "Safra Catz",
    knownFor: "Oracle CEO — enterprise database and cloud contract cycles",
    imageUrl: IMG.p2,
  },
];

export function bankForScene(scene: LifestyleSceneId): LifestyleSceneBankEntry[] {
  return scene === "belgium" ? BELGIUM_SCENE_BANK : INTERNATIONAL_SCENE_BANK;
}
