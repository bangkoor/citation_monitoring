// Lecturer photos in public/dosen/<slug>.jpg (256x256), from the KSHE lecturer profile page, cropped to a square around the face.
export const PHOTOS = new Set<string>(["abdul-haris-mustari", "agus-hikmat", "agus-priyono", "amrina-rosyada", "ani-mardiastuti", "arif-kurnia-wijayanto", "arzyana-sunkar", "burhanuddin-masyud", "dede-aulia-rahman", "dones-rinaldi", "edhi-sandra", "eks-harini-muntasib", "ervizal-a-m-zuhud", "eva-rachmawati", "fairuz-rafidah-aflaha", "harnios-arief", "haryanto", "jarwadi-budi-hernowo", "lilik-budi-prasetyo", "lin-nuriah-ginoga", "mirza-dikari-kusrini", "nandi-kosmaryandi", "nyoto-santoso", "rachmad-hermawan", "resti-meilani", "ricky-avenzora", "rinekso-soekmadi", "sambas-basuni", "siswoyo", "siti-badriyah-rushayati", "sutopo", "syafitri-hidayati", "tutut-sunarminto", "yanto-santosa", "yeni-aryati-mulyani", "yudi-setiawan"]);

export const photoSlug = (name: string) =>
  name.normalize("NFKD").replace(/[^\x00-\x7f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const photoFor = (name: string) => {
  const s = photoSlug(name);
  return PHOTOS.has(s) ? `/dosen/${s}.jpg` : null;
};
