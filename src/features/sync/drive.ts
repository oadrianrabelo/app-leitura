import { httpFetch } from "../../lib/http";
import { dropAccessToken, getAccessToken } from "./google";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  appProperties?: Record<string, string>;
}

/** Chamada ao Drive com token; renova uma vez se o token tiver vencido. */
async function call(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAccessToken(false);
  const res = await httpFetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
  if (res.status === 401 && retry) {
    dropAccessToken();
    return call(url, init, false);
  }
  if (!res.ok) throw new Error(`Google Drive respondeu ${res.status}`);
  return res;
}

export async function whoAmI(): Promise<{ email: string; name: string }> {
  const res = await call(`${API}/about?fields=user(emailAddress,displayName)`);
  const data = (await res.json()) as { user: { emailAddress: string; displayName: string } };
  return { email: data.user.emailAddress, name: data.user.displayName };
}

/** Todos os arquivos da pasta privada do app. */
export async function listFiles(): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      pageSize: "1000",
      fields: "nextPageToken,files(id,name,modifiedTime,size,appProperties)",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await call(`${API}/files?${params}`);
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    files.push(...data.files);
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

export async function download(id: string): Promise<ArrayBuffer> {
  const res = await call(`${API}/files/${id}?alt=media`);
  return res.arrayBuffer();
}

/** Cria ou substitui um arquivo (envio "resumable": serve para arquivos grandes também). */
export async function upload(
  name: string,
  body: Uint8Array,
  type: string,
  opts: { id?: string; appProperties?: Record<string, string> } = {},
): Promise<string> {
  const meta: Record<string, unknown> = { name };
  if (!opts.id) meta.parents = ["appDataFolder"];
  if (opts.appProperties) meta.appProperties = opts.appProperties;
  const start = await call(
    opts.id ? `${UPLOAD}/files/${opts.id}?uploadType=resumable` : `${UPLOAD}/files?uploadType=resumable`,
    {
      method: opts.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": type },
      body: JSON.stringify(meta),
    },
  );
  const location = start.headers.get("location");
  if (!location) throw new Error("O Drive não abriu o envio");
  const res = await call(location, { method: "PUT", headers: { "Content-Type": type }, body: body as unknown as BodyInit });
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function remove(id: string) {
  await call(`${API}/files/${id}`, { method: "DELETE" }).catch(() => {});
}
