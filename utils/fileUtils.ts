
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result is "data:image/jpeg;base64,xxxxxxxx"
      // we only want the "xxxxxxxx" part
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export const parseDataUrl = (dataUrl: string): { base64: string; mimeType: string } => {
  const parts = dataUrl.split(',');
  if (parts.length !== 2 || !parts[0].includes(';base64')) {
    throw new Error('Invalid Data URL format');
  }
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const base64 = parts[1];
  return { base64, mimeType };
};
