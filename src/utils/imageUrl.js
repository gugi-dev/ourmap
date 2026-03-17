// Convert known hosting URLs to direct image links
export function toDirectImageUrl(url) {
  if (!url) return url

  // Google Drive: extract file ID and convert to direct link
  // Handles: drive.google.com/file/d/FILE_ID/view...
  //          drive.google.com/open?id=FILE_ID
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveFileMatch) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`
  }

  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (driveOpenMatch) {
    return `https://lh3.googleusercontent.com/d/${driveOpenMatch[1]}`
  }

  // Google Drive uc?export links — already direct, keep as-is
  if (url.includes('drive.google.com/uc?')) return url

  // Dropbox: replace dl=0 with dl=1 for direct download
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    return url.replace('dl=0', 'dl=1')
  }

  return url
}
