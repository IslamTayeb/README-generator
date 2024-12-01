"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

interface RenameDialogProps {
  currentName: string;
  onRename: (newName: string) => void;
  children: React.ReactNode;
}

const RenameDialog = ({ currentName, onRename, children }: RenameDialogProps) => {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState(currentName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim() && newName.trim() !== currentName) {
      onRename(newName.trim())
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
      }}>
        {children}
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => {
        e.preventDefault()
      }}>
        <form onSubmit={handleSubmit} id="rename-form">
          <DialogHeader>
            <DialogTitle>Rename Section</DialogTitle>
            <DialogDescription>
              Enter a new name for this section. The name should be descriptive and unique.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="section-name"
              name="section-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              autoComplete="off"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RenameDialog;
