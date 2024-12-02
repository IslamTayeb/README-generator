
import React, { useRef } from "react";
import Excalidraw from "@excalidraw/excalidraw";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ExcalidrawIntegration({ onExport }: { onExport: (data: Blob) => void }) {
  const excalidrawRef = useRef<any>(null);

  const handleExport = async () => {
    if (excalidrawRef.current) {
      const scene = await excalidrawRef.current.getScene();
      const blob = await Excalidraw.exportToBlob({
        elements: scene.elements,
        appState: scene.appState,
        files: scene.files,
        mimeType: "image/png",
      });
      onExport(blob);
    }
  };

  return (
    <div className="flex flex-col h-[40%]">
      <div className="flex justify-end p-2 bg-background border-b">
        <Button onClick={handleExport}>Export</Button>
      </div>
      <ScrollArea className="flex-grow">
        <Excalidraw ref={excalidrawRef} />
      </ScrollArea>
    </div>
  );
}
