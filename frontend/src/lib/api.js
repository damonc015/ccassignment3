const apiKey = import.meta.env.VITE_API_KEY
if (!apiKey) {
  throw new Error("VITE_API_KEY is not set. Add it to frontend/.env.local (see .env.example).")
}

const client = window.apigClientFactory.newClient({ apiKey })

export const SUPPORTED_TYPES = ["image/jpeg", "image/png"]

export async function searchPhotos(q) {
  const response = await client.searchGet({ q }, {}, {})
  return response.data.results ?? []
}

export async function uploadPhoto(file, customLabels) {
  await client.photosObjectPut(
    { object: file.name, "Content-Type": file.type, "x-amz-meta-customLabels": customLabels.join(", ") },
    file,
    {},
  )
}

export function errorMessage(error) {
  const status = error?.status ?? error?.response?.status
  const message = error?.data?.message ?? error?.response?.data?.message ?? error?.message ?? "request failed"
  return status ? `${status}: ${message}` : message
}
