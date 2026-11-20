import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SUPPORTED_TYPES, errorMessage, searchPhotos, uploadPhoto } from "@/lib/api"

function SearchCard() {
  const [query, setQuery] = useState("")
  const [photos, setPhotos] = useState([])
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(event) {
    
    event.preventDefault()
    const q = query.trim()
    if (!q) return

    setBusy(true)
    setStatus("Searching...")
    setPhotos([])
    try {
      const results = await searchPhotos(q)
      setPhotos(results)
      setStatus(results.length ? `${results.length} photo(s) found.` : "No photos found.")
    } catch (error) {
      console.error(error)
      setStatus(`Search failed (${errorMessage(error)}).`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Label htmlFor="search-query" className="sr-only">
            Search query
          </Label>
          <Input
            id="search-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            required
          />
          <Button type="submit" disabled={busy}>
            Search
          </Button>
        </form>
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {status}
        </p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.url} className="overflow-hidden rounded-lg border">
                <img src={photo.url} alt={photo.labels.join(", ")} loading="lazy" className="aspect-4/3 w-full object-cover" />
                <p className="p-2 text-xs text-muted-foreground">{photo.labels.join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function UploadCard() {
  const [file, setFile] = useState(null)
  const [labels, setLabels] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)

  function onFileChange(event) {
    setFile(event.target.files?.[0] ?? null)
    setStatus("")
  }

  async function onUpload() {
    if (!file) return
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setStatus("Only JPEG and PNG images are supported.")
      return
    }

    const customLabels = labels
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)

    setBusy(true)
    setStatus("Uploading...")
    try {
      await uploadPhoto(file, customLabels)
      setStatus(`Uploaded ${file.name}. It will be searchable in a few seconds.`)
      setFile(null)
      setLabels("")
      fileInput.current.value = ""
    } catch (error) {
      console.error(error)
      setStatus(`Upload failed (${errorMessage(error)}).`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="upload-file">Photo (JPEG or PNG)</Label>
            <input
              ref={fileInput}
              id="upload-file"
              type="file"
              accept={SUPPORTED_TYPES.join(",")}
              onChange={onFileChange}
              className="sr-only"
              tabIndex={-1}
            />
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => fileInput.current.click()} disabled={busy}>
                Choose photo
              </Button>
              <span className="truncate text-sm text-muted-foreground">{file ? file.name : "No photo selected"}</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="upload-labels">Custom labels (comma-separated, optional)</Label>
            <Input id="upload-labels" value={labels} onChange={(event) => setLabels(event.target.value)} />
          </div>
          <Button type="button" onClick={onUpload} disabled={busy || !file} className="justify-self-start">
            Upload
          </Button>
          <p role="status" className="min-h-5 text-sm text-muted-foreground">
            {status}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function App() {
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">AI Photo Search</h1>
      <SearchCard />
      <UploadCard />
    </main>
  )
}
