import * as React from 'react'

import type { FavoriteWithPlatform, WatchlistItemWithPlatform, WatchlistItemStatus } from '@acme/shared'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'
import { usePlatformsQuery } from '../lib/queries/platforms'
import {
  useAddFavoriteMutation,
  useDeleteFavoriteMutation,
  useFavoritesQuery,
  useUpdateFavoriteMutation,
} from '../lib/queries/favorites'
import {
  useAddWatchlistMutation,
  useDeleteWatchlistMutation,
  useUpdateWatchlistMutation,
  useWatchlistQuery,
} from '../lib/queries/watchlist'

function EditNotesDialog(props: {
  title: string
  description: string
  defaultTags: string | null
  defaultNotes: string | null
  onSave: (input: { tags?: string; notes?: string }) => void
  triggerLabel: string
}) {
  const [open, setOpen] = React.useState(false)
  const [tags, setTags] = React.useState(props.defaultTags ?? '')
  const [notes, setNotes] = React.useState(props.defaultNotes ?? '')

  React.useEffect(() => {
    if (open) {
      setTags(props.defaultTags ?? '')
      setNotes(props.defaultNotes ?? '')
    }
  }, [open, props.defaultNotes, props.defaultTags])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {props.triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Tags</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. short, brand" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you want to remember" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              props.onSave({
                tags: tags || undefined,
                notes: notes || undefined,
              })
              setOpen(false)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DashboardPage() {
  const platforms = usePlatformsQuery()
  const favorites = useFavoritesQuery()
  const watchlist = useWatchlistQuery()

  const addFavorite = useAddFavoriteMutation()
  const updateFavorite = useUpdateFavoriteMutation()
  const deleteFavorite = useDeleteFavoriteMutation()

  const addWatchlist = useAddWatchlistMutation()
  const updateWatchlist = useUpdateWatchlistMutation()
  const deleteWatchlist = useDeleteWatchlistMutation()

  const [newFavoritePlatformId, setNewFavoritePlatformId] = React.useState<number | ''>('')
  const [newFavoriteHandle, setNewFavoriteHandle] = React.useState('')

  const [newWatchPlatformId, setNewWatchPlatformId] = React.useState<number | ''>('')
  const [newWatchHandle, setNewWatchHandle] = React.useState('')

  const platformOptions = platforms.data ?? []

  React.useEffect(() => {
    if (platformOptions.length > 0 && newFavoritePlatformId === '') {
      setNewFavoritePlatformId(platformOptions[0].id)
    }
    if (platformOptions.length > 0 && newWatchPlatformId === '') {
      setNewWatchPlatformId(platformOptions[0].id)
    }
  }, [newFavoritePlatformId, newWatchPlatformId, platformOptions])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Favorites, watchlists, and quick actions.</p>
      </div>

      <Tabs defaultValue="favorites">
        <TabsList>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>Add favorite</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Platform</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={newFavoritePlatformId}
                  onChange={(e) => setNewFavoritePlatformId(Number(e.target.value))}
                >
                  {platformOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Handle</label>
                <Input
                  className="mt-1"
                  value={newFavoriteHandle}
                  onChange={(e) => setNewFavoriteHandle(e.target.value)}
                  placeholder="brandname"
                />
              </div>
              <Button
                onClick={() => {
                  if (typeof newFavoritePlatformId !== 'number') return
                  if (!newFavoriteHandle.trim()) return
                  addFavorite.mutate({
                    platformId: newFavoritePlatformId,
                    handle: newFavoriteHandle.trim(),
                  })
                  setNewFavoriteHandle('')
                }}
              >
                Add
              </Button>
            </CardContent>
          </Card>

          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-3 text-left">Platform</th>
                  <th className="p-3 text-left">Handle</th>
                  <th className="p-3 text-left">Tags</th>
                  <th className="p-3 text-left">Notes</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(favorites.data ?? []).map((f) => (
                  <FavoriteRow
                    key={f.id}
                    favorite={f}
                    onEdit={(input) => updateFavorite.mutate({ id: f.id, ...input })}
                    onDelete={() => deleteFavorite.mutate(f.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="watchlist">
          <Card>
            <CardHeader>
              <CardTitle>Add to watchlist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Platform</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={newWatchPlatformId}
                  onChange={(e) => setNewWatchPlatformId(Number(e.target.value))}
                >
                  {platformOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Handle</label>
                <Input
                  className="mt-1"
                  value={newWatchHandle}
                  onChange={(e) => setNewWatchHandle(e.target.value)}
                  placeholder="brandname"
                />
              </div>
              <Button
                onClick={() => {
                  if (typeof newWatchPlatformId !== 'number') return
                  if (!newWatchHandle.trim()) return
                  addWatchlist.mutate({
                    platformId: newWatchPlatformId,
                    handle: newWatchHandle.trim(),
                  })
                  setNewWatchHandle('')
                }}
              >
                Add
              </Button>
            </CardContent>
          </Card>

          <div className="mt-4 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-3 text-left">Platform</th>
                  <th className="p-3 text-left">Handle</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Tags</th>
                  <th className="p-3 text-left">Notes</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(watchlist.data ?? []).map((w) => (
                  <WatchlistRow
                    key={w.id}
                    item={w}
                    onUpdate={(input) => updateWatchlist.mutate({ id: w.id, ...input })}
                    onDelete={() => deleteWatchlist.mutate(w.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FavoriteRow(props: {
  favorite: FavoriteWithPlatform
  onEdit: (input: { tags?: string; notes?: string }) => void
  onDelete: () => void
}) {
  const f = props.favorite

  return (
    <tr className="border-t">
      <td className="p-3">{f.platform.name}</td>
      <td className="p-3 font-mono">{f.handle}</td>
      <td className="p-3 text-muted-foreground">{f.tags ?? '—'}</td>
      <td className="p-3 text-muted-foreground">{f.notes ?? '—'}</td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-2">
          <EditNotesDialog
            title="Edit favorite"
            description={`${f.platform.name} · @${f.handle}`}
            defaultTags={f.tags}
            defaultNotes={f.notes}
            onSave={props.onEdit}
            triggerLabel="Edit"
          />
          <Button size="sm" variant="destructive" onClick={props.onDelete}>
            Remove
          </Button>
        </div>
      </td>
    </tr>
  )
}

function WatchlistRow(props: {
  item: WatchlistItemWithPlatform
  onUpdate: (input: { status?: WatchlistItemStatus; tags?: string; notes?: string }) => void
  onDelete: () => void
}) {
  const w = props.item

  return (
    <tr className="border-t">
      <td className="p-3">{w.platform.name}</td>
      <td className="p-3 font-mono">{w.handle}</td>
      <td className="p-3">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={w.status}
          onChange={(e) => props.onUpdate({ status: e.target.value as WatchlistItemStatus })}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </td>
      <td className="p-3 text-muted-foreground">{w.tags ?? '—'}</td>
      <td className="p-3 text-muted-foreground">{w.notes ?? '—'}</td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-2">
          <EditNotesDialog
            title="Edit watchlist"
            description={`${w.platform.name} · @${w.handle}`}
            defaultTags={w.tags}
            defaultNotes={w.notes}
            onSave={(input) => props.onUpdate(input)}
            triggerLabel="Edit"
          />
          <Button size="sm" variant="destructive" onClick={props.onDelete}>
            Remove
          </Button>
        </div>
      </td>
    </tr>
  )
}
