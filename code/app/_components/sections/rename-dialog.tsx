"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import React from "react";

interface RenameDialogProps {
  currentName: string;
  onRename: (newName: string) => void;
  children: React.ReactNode;
}

const RenameDialog = ({ currentName, onRename, children }: RenameDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(currentName);

  const handleSubmit = () => {
    if (newName.trim()) {
      onRename(newName.trim());
      setOpen(false);
    }
  };

  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        onClick: () => setOpen(true),
      })}
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Section</DialogTitle>
              <DialogDescription>
                Enter a new name for this section.
              </DialogDescription>
            </DialogHeader>
            <Input
              id="rename-input"
              name="rename"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
            />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default RenameDialog;
