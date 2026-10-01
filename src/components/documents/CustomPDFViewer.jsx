import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { ZoomIn, ZoomOut, Download, Printer, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forceDownload } from "@/lib/utils";

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function CustomPDFViewer({ url, name }) {
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let loadingTask;
    setIsLoading(true);
    setError(null);

    const loadPDF = async () => {
      if (!url) {
        setError("Invalid PDF URL");
        setIsLoading(false);
        return;
      }
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const loadedPdf = await loadingTask.promise;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setPageNumber(1);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError(err.message || "Could not load PDF document.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();

    return () => {
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [url]);

  useEffect(() => {
    if (!pdf) return;

    let renderTask;
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, scale]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handlePrevPage = () => setPageNumber((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setPageNumber((p) => Math.min(p + 1, numPages));

  const handleDownload = () => forceDownload(url, name || "document.pdf");

  const handlePrint = () => {
    // Basic print fallback for iframe-based printing
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
  };

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden text-foreground">
      {/* Custom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5} className="hover:bg-muted">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={scale >= 3.0} className="hover:bg-muted">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={pageNumber <= 1} className="hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {pageNumber} / {numPages || 1}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={pageNumber >= numPages} className="hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleDownload} className="hover:bg-muted">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrint} className="hover:bg-muted">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas Area */}
      <div className="flex-1 overflow-auto bg-muted/20 p-4 sm:p-8 flex justify-center">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-destructive">
            <AlertCircle className="w-10 h-10" />
            <p className="font-medium text-sm text-center max-w-xs">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="mx-auto" style={{ width: "fit-content" }}>
            <canvas
              ref={canvasRef}
              className="shadow-xl ring-1 ring-border/50"
              style={{
                backgroundColor: "white",
                display: "block",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
