import React, { useState, useRef, useCallback, useEffect } from "react";
import rightImage from "../../assets/right.png";
import leftImage from "../../assets/left.png";
import { Position, Transform } from "./types";
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FlipHorizontal,
  RefreshCw,
  Download,
  X,
} from "lucide-react";

export const PhotoEditor: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string>("");
  const [currentHatImage, setCurrentHatImage] = useState<string>(rightImage);
  const [transform, setTransform] = useState<Transform>({
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
    flipX: false,
  });
  const [originalImageSize, setOriginalImageSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [status, setStatus] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const statusTimeoutRef = useRef<NodeJS.Timeout>();

  const showStatus = useCallback(
    (message: string, type: "error" | "success") => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      setStatus({ message, type });

      statusTimeoutRef.current = setTimeout(() => {
        setStatus(null);
      }, 1000);
    },
    []
  );

  const handleBaseImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          showStatus("Please select an image file", "error");
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            setOriginalImageSize({ width: img.width, height: img.height });
            showStatus("Image loaded successfully", "success");
          };
          const dataUrl = e.target?.result as string;
          img.src = dataUrl;
          setBaseImage(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    },
    [showStatus]
  );

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        isDragging.current = true;
        const touch = e.touches[0];
        dragStart.current = {
          x: touch.clientX - transform.position.x,
          y: touch.clientY - transform.position.y,
        };
      }
    },
    [transform.position]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (isDragging.current && e.touches.length === 1) {
      const touch = e.touches[0];
      setTransform((prev) => ({
        ...prev,
        position: {
          x: touch.clientX - dragStart.current.x,
          y: touch.clientY - dragStart.current.y,
        },
      }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX - transform.position.x,
        y: e.clientY - transform.position.y,
      };
    },
    [transform.position]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      setTransform((prev) => ({
        ...prev,
        position: {
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        },
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleRotate = useCallback((direction: "left" | "right") => {
    setTransform((prev) => ({
      ...prev,
      rotation: prev.rotation + (direction === "left" ? -15 : 15),
    }));
  }, []);

  const handleScale = useCallback((direction: "up" | "down") => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(
        0.1,
        Math.min(7, prev.scale * (direction === "up" ? 1.1 : 0.9))
      ),
    }));
  }, []);

  const handleFlip = useCallback(() => {
    setCurrentHatImage((prev) =>
      prev === rightImage ? leftImage : rightImage
    );
  }, []);

  const handleReset = useCallback(() => {
    setTransform({
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
      flipX: false,
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!baseImage || !overlayRef.current || !containerRef.current) {
      showStatus("Please upload an image first", "error");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      const baseImg = new Image();
      baseImg.src = baseImage;
      await new Promise((resolve) => (baseImg.onload = resolve));

      canvas.width = originalImageSize.width;
      canvas.height = originalImageSize.height;

      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerAspect = containerRect.width / containerRect.height;
      const imageAspect = canvas.width / canvas.height;

      let displayedWidth = containerRect.width;
      let displayedHeight = containerRect.height;
      if (containerAspect > imageAspect) {
        displayedWidth = displayedHeight * imageAspect;
      } else {
        displayedHeight = displayedWidth / imageAspect;
      }

      const scaleX = canvas.width / displayedWidth;
      const scaleY = canvas.height / displayedHeight;

      const overlayImg = overlayRef.current.querySelector("img");
      if (overlayImg) {
        const hatImg = new Image();
        hatImg.src = currentHatImage;
        await new Promise((resolve) => (hatImg.onload = resolve));

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.save();
        ctx.translate(
          centerX + transform.position.x * scaleX,
          centerY + transform.position.y * scaleY
        );
        ctx.rotate((transform.rotation * Math.PI) / 180);
        if (transform.flipX) {
          ctx.scale(-1, 1);
        }
        ctx.scale(transform.scale, transform.scale);

        const overlayWidth = 100 * scaleX;
        const overlayHeight = (overlayWidth * hatImg.height) / hatImg.width;
        ctx.drawImage(
          hatImg,
          -overlayWidth / 2,
          -overlayHeight / 2,
          overlayWidth,
          overlayHeight
        );

        ctx.restore();
      }

      const link = document.createElement("a");
      link.download = "fair-hat.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      showStatus("Image saved successfully", "success");
    } catch (error) {
      console.error("Save error:", error);
      showStatus("Error saving image", "error");
    }
  }, [baseImage, transform, originalImageSize, currentHatImage, showStatus]);

  const getOverlayStyle = () => {
    return {
      transform: `translate(-50%, -50%) 
                       translate(${transform.position.x}px, ${
        transform.position.y
      }px)
                       rotate(${transform.rotation}deg)
                       scale(${transform.scale * (transform.flipX ? -1 : 1)}, ${
        transform.scale
      })`,
    };
  };

  const getIcon = (text: string) => {
    switch (text) {
      case "Rotate Left":
        return <RotateCcw className="w-5 h-5 mr-2" />;
      case "Rotate Right":
        return <RotateCw className="w-5 h-5 mr-2" />;
      case "Scale Up":
        return <ZoomIn className="w-5 h-5 mr-2" />;
      case "Scale Down":
        return <ZoomOut className="w-5 h-5 mr-2" />;
      case "Flip":
        return <FlipHorizontal className="w-5 h-5 mr-2" />;
      case "Reset":
        return <RefreshCw className="w-5 h-5 mr-2" />;
      case "Save Image":
        return <Download className="w-5 h-5 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full min-h-screen font-['Inter'] bg-[#131314] text-[#f0f0f0] overflow-x-hidden">
      <div className="flex flex-col items-center w-full max-w-7xl mx-auto">
        <div className="text-center my-4 md:my-8">
          <h1 className="flex flex-col md:flex-row items-center gap-2 md:gap-9 text-white text-xl md:text-4xl lg:text-5xl tracking-wider font-bold m-0">
            <span>Join the</span>
            <div className="text-[#ff6b2b] font-bold tracking-[0.5em] text-xl md:text-4xl lg:text-5xl drop-shadow-[0_0_15px_rgba(255,107,43,0.5)]">
              F A I R
            </div>
            <span>Movement</span>
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mt-8">
          {/* Left Column: File Upload and Options */}
          <div className="flex flex-col gap-6 w-full lg:w-1/3">
            <div className="w-full">
              <input
                type="file"
                accept="image/*"
                onChange={handleBaseImageUpload}
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm text-white cursor-pointer transition-all duration-300 ease-in-out hover:border-[#ff6b2b]/50 hover:bg-[#ff6b2b]/10 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ff6b2b] file:text-white hover:file:cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl">
              {[
                "Rotate Left",
                "Rotate Right",
                "Scale Up",
                "Scale Down",
                "Flip",
                "Reset",
                "Save Image",
              ].map((text) => (
                <button
                  key={text}
                  onClick={() => {
                    if (text === "Rotate Left") handleRotate("left");
                    else if (text === "Rotate Right") handleRotate("right");
                    else if (text === "Scale Up") handleScale("up");
                    else if (text === "Scale Down") handleScale("down");
                    else if (text === "Flip") handleFlip();
                    else if (text === "Reset") handleReset();
                    else if (text === "Save Image") handleSave();
                  }}
                  disabled={text === "Save Image" && !baseImage}
                  className={`${
                    text === "Save Image" ? "col-span-2" : ""
                  } px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white cursor-pointer text-sm font-semibold uppercase tracking-wider transition-all duration-300 ease-in-out 
                                    hover:bg-[#ff6b2b]/20 hover:border-[#ff6b2b]/60 hover:shadow-[0_0_20px_rgba(255,107,43,0.4)] 
                                    active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:transform-none flex items-center justify-center`}
                >
                  {getIcon(text)}
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Canvas */}
          <div className="flex-1 flex justify-center">
            <div
              ref={containerRef}
              className="relative w-full max-w-[800px] h-[600px] border border-[#ff6b2b]/50 rounded-3xl overflow-hidden touch-none bg-[#ff6b2b]/5 backdrop-blur-xl shadow-2xl"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {baseImage && (
                <img
                  src={baseImage}
                  alt="Base"
                  className="w-full h-full object-contain"
                />
              )}

              <div
                ref={overlayRef}
                style={getOverlayStyle()}
                className="absolute top-1/2 left-1/2 cursor-move touch-none filter drop-shadow-lg"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={currentHatImage}
                  alt="Overlay"
                  className="w-[100px] h-auto select-none"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>

        {status && (
          <div
            className={`fixed bottom-20 right-8 px-6 py-3 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl
                    ${
                      status.type === "error"
                        ? "bg-red-500/80 text-white"
                        : "bg-green-500/80 text-white"
                    }
                    font-medium
                    transition-opacity duration-300
                    opacity-90 animate-fade-out`}
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="mt-auto p-2 flex justify-center sm:justify-between items-center bg-white/5 rounded-xl backdrop-blur-xl shadow-2xl z-40 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4 ml-4">
          <a
            href="https://icm.run"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-[#ff6b2b] transition-colors"
          >
            <img
              src={require("../../assets/icm.avif")}
              alt="ICM"
              className="w-8 h-8 rounded-full"
            />
          </a>

          <X className="w-5 h-5" />
          <a
            href="https://fair.club"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-[#ff6b2b] transition-colors"
          >
            <div className="text-[#ff6b2b] font-bold tracking-[0.5em] text-lg">
              F A I R
            </div>
          </a>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-white/40 text-sm mr-4">
          <a
            href="https://x.com/icmdotrun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-[#ff6b2b] transition-colors"
          >
            @icmdotrun
          </a>
          <a
            href="https://x.com/fairdotclub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-[#ff6b2b] transition-colors"
          >
            @fairdotclub
          </a>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
