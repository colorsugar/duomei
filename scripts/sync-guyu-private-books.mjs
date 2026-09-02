import { createHash } from "node:crypto";
import { getStore } from "@edgeone/pages-blob";

const PROJECT_ID = "makers-brifmhu31vjf";
const NAMESPACE = "guyu-private";
const PREFIX = "private-media/guyu/zhi-shang-feiyan/pages";
const SOURCE_AUDIT = Object.freeze({
  repository: "colorsugar/-",
  commit: "249736f5dd4914f1797a6eb5b4e8d9226edb6be9",
});
// The private repository was audited separately; these fixed page hashes are
// the byte-level enforcement boundary for its immutable public deployment.
const SOURCE = "https://zhi-shang-feiyan-52dbdlv5c-duomei.vercel.app/pages";
const PAGE_HASHES = Object.freeze([
  "e746999363322d0198ac38ee4811cc75a148cc2bfa9a42005e50c2f66e8bba8d", "8853bf1f16c0776211103628e9dd0765b0b9b16474a0b80768de32e225b62a83",
  "36756b7386ee0176c4309c20bd32a90d629788754145e780fb629995a83bd5a2", "d8ef22c1c8a8d8ffcb20f461ede2e33f83de6babee44b19673aed92883f25e8c",
  "a4a2fc148e21c0ffac3252e51359d46c7973e1109c8df97f43eafa1a4bd3bd96", "24708372b08bafc462a8e1912a1dcde6e109c801330cdc333a76702bd17aefeb",
  "52b4fe7a61c31cf04e8fafd82f5cc908f4eb8d814e91e409118d93f00e5db300", "d1665c9f9a1028e5d2991db9431b4ff691f8dd85b71898c938da04fcad68e235",
  "aa1ae04582c8e267fff36af886f8fdce9f1be1438d042b69a4f405182af69de2", "e048bd601abb20bbaffd50c48bfaf18a9a8fd4a587986d7a44d965ffaa25711b",
  "d488efb7639554e731984021df4a060b501d3cdd559072639a7a58c636ca5edd", "f081e583a027f820655db4e264e476b0afd385956f51c609579eace87ca79616",
  "b56a03e24cb354831e72b9cc600d2d132fe0eff4d3e2e05679d141f6ef869cde", "6fd234281a0b5e480f6abd056b5644cbd76e4e29524e5578f95b3f1bb6383e3a",
  "1750c9482a2d562a0556cd8e7045e4cf635fd9f6e4c0d4e387ed6a126044be50", "d270f0100da85528633682befb9a210b1a03c1ac16feaea90173a828203338c3",
  "1e8c4dae12234f9ab028d6833154bc897342376a13dada4d0d4565db3026fea2", "1b22153515ecb0161debb109122daa83e9fa388884a206b09bf03821d7176902",
  "1d790401e6839077bf12ff2e6244447b3d871e6792e647b58b27673bb82aeaf7", "e906271a6006751824ee2f52a05d8349e1a4d18b51e0ad00aecf7e231dc614c6",
  "a1b9d5e499efc1a81bed0f681518926702eb671511c18556bf21a9a31469f033", "7d99f78dd1dca931bd313d811cafdf52c1bbea9eaccf1d857772b3ce27de5529",
  "2103c593efdbb92352c6d72057dd30dbdfb22208078d35396442c7b23c04667b", "226eff866e15ad15dbfb679ce34d682226be55853cefe5d08e8d0ed05c91cc44",
  "a8ea7fe9d7b2bf8d499029d7191895bf4f5060627c0f926bf49e1416e4ddcb09", "2b4ba540ab5834e585ffc6ba02668561f750a2af020acae5267f0d986d8e4448",
  "2b3f0227c3634c69d43ed8b20498a4eeade3f69c0a5ecccf0b1e531ca3c45345", "c31dda6373461f96c723e1706c2e2a80a9eb4f56e4ed31ed7e037a6f15ea482c",
  "57e5d7b515306bf4aa5c305971d205b1e20e1f4c50fa19e866f4ff23a2d837da", "6dd0c0090b70c270c2ccde1d7f1e38f27aaa18c8df330459819a8e9d202fb345",
]);

const check = process.argv.includes("--check");
if (
  PAGE_HASHES.length !== 30
  || new Set(PAGE_HASHES).size !== 30
  || !PAGE_HASHES.every((hash) => /^[0-9a-f]{64}$/.test(hash))
  || SOURCE_AUDIT.repository !== "colorsugar/-"
  || !/^[0-9a-f]{40}$/.test(SOURCE_AUDIT.commit)
  || !/^private-media\/guyu\/zhi-shang-feiyan\/pages$/.test(PREFIX)
  || SOURCE !== "https://zhi-shang-feiyan-52dbdlv5c-duomei.vercel.app/pages"
) {
  throw new Error("invalid immutable book manifest");
}
if (check) {
  console.log("Guyu private book sync check passed (network disabled).");
  process.exit(0);
}

const token = process.env.EDGEONE_API_TOKEN;
if (!token) throw new Error("EDGEONE_API_TOKEN is required");
const store = getStore({ name: NAMESPACE, projectId: PROJECT_ID, token, consistency: "strong" });

for (let i = 0; i < PAGE_HASHES.length; i += 1) {
  const page = String(i + 1).padStart(3, "0");
  const key = `${PREFIX}/${page}.webp`;
  const existing = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
  if (existing) {
    const existingHash = createHash("sha256").update(Buffer.from(existing)).digest("hex");
    if (existingHash !== PAGE_HASHES[i]) throw new Error(`refusing to overwrite changed object ${page}`);
    continue;
  }

  const response = await fetch(`${SOURCE}/${page}.webp`);
  if (!response.ok) throw new Error(`source page ${page} unavailable (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length > 5_500_000 || bytes.subarray(0, 4).toString() !== "RIFF" || bytes.subarray(8, 12).toString() !== "WEBP" || hash !== PAGE_HASHES[i]) {
    throw new Error(`source page ${page} failed immutable WebP validation`);
  }
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  await store.set(key, body, { onlyIfNew: true });
  const written = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
  if (!written || createHash("sha256").update(Buffer.from(written)).digest("hex") !== hash) throw new Error(`strong readback failed for ${page}`);
}
console.log("Guyu private book sync completed: 30 pages verified.");
