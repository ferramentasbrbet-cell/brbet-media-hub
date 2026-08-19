const ROOT_FOLDER_ID = '1DQ7WSwLjapH-cmOmw7sux3tsyKloPC6o';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'A variável GOOGLE_DRIVE_API_KEY não foi configurada na Vercel.' });
  const folderId = String(req.query.folderId || ROOT_FOLDER_ID).replace(/[^a-zA-Z0-9_-]/g, '');
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = 'nextPageToken,files(id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink,iconLink)';
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('fields', fields);
  url.searchParams.set('orderBy', 'folder,name');
  url.searchParams.set('pageSize', '1000');
  url.searchParams.set('key', apiKey);
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Não foi possível consultar o Google Drive.' });
    const files = (data.files || []).map((file) => ({ ...file, isFolder: file.mimeType === FOLDER_MIME, size: Number(file.size || 0), openUrl: file.webViewLink || `https://drive.google.com/open?id=${file.id}` }));
    return res.status(200).json({ folderId, files, updatedAt: new Date().toISOString() });
  } catch {
    return res.status(500).json({ error: 'Falha temporária ao acessar o Drive.' });
  }
}