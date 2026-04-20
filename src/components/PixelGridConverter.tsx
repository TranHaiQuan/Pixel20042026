import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import {
  Upload, Download, Grid3X3, Palette, Save, FolderOpen, ArrowRightLeft, Check, X, Scissors, Trash2, Combine, Activity, Maximize, Key, Wind, Plus, Layers, Paintbrush, PaintBucket, Lock,
  ChevronUp, ChevronDown, Maximize2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

enum FacingDirection {
  Left = 0,
  Up = 1,
  Right = 2,
  Down = 3
}

import { LevelData, ShooterData } from "@/types/LevelData";
type PixelDataEntry = {
  x: number;
  y: number;
  material: number;
  areaX: number;
  areaY: number;
};

type PixelHealthData = {
  x: number;
  y: number;
  health: number;
};

type GridPointData = {
  X: number;
  Y: number;
};

type KeyData = {
  GridPoints: GridPointData[];
};

type KeysData = {
  Keys: KeyData[];
};

type SurprisePixelsData = {
  Pixels: GridPointData[];
};

type PixelPipePixelGroupData = {
  Material: number;
  Count: number;
};

type PixelPipeData = {
  GridPoints: GridPointData[];
  Queue: PixelPipePixelGroupData[];
};

type PixelPipesData = {
  Pipes: PixelPipeData[];
};

type GateData = {
  GridPoints: GridPointData[];
  Direction: number;
  Length: number;
  Material: number;
  Count: number;
};

type GatesData = {
  Gates: GateData[];
};

type PixelImageData = {
  id: number;
  width: number;
  height: number;
  physicalWidth: number;
  physicalHeight: number;
  pixels: PixelDataEntry[];
  pixelHealths: PixelHealthData[];
  keys: KeysData;
  surprisePixels: SurprisePixelsData;
  pixelPipes: PixelPipesData;
  gates: GatesData;
};

type GridData = {
  grid: number[][];
  width: number;
  height: number;
};

const DEFAULT_MASTER_PALETTE: string[] = [
  "#2F2F2F", "#613E23", "#474652", "#878EC0",
  "#B2544A", "#CF8AB2", "#A00D0D", "#C4AA70",
  "#7829E1", "#959D67", "#5C8782", "#0073FF",
  "#888795", "#FF6200", "#C37B7C", "#9328A7",
  "#BF83E2", "#D2914F", "#9F6A44", "#7B730A",
  "#8D404D", "#1D6553", "#39205D", "#046000",
  "#6F0F0F", "#C04983", "#7B4827", "#2FAACF",
  "#CCCCCC", "#3FAC1D", "#0E39CC", "#D2A626",
];

const STORAGE_KEY = "pixel-grid-master-palette";

const loadSavedPalette = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(c => typeof c === "string");
      }
    }
  } catch { /* ignore */ }
  return [...DEFAULT_MASTER_PALETTE];
};

const parseHex = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");

// --- Helper Components ---

const CanvasSizeDialog = ({ 
  open, 
  onOpenChange, 
  pendingW, 
  setPendingW, 
  pendingH, 
  setPendingH, 
  anchor, 
  setAnchor, 
  onConfirm,
  currentW,
  currentH
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingW: any;
  setPendingW: (val: any) => void;
  pendingH: any;
  setPendingH: (val: any) => void;
  anchor: string;
  setAnchor: (val: any) => void;
  onConfirm: () => void;
  currentW: number;
  currentH: number;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Canvas Size</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-right text-xs">Width</span>
          <Input
            type="text"
            value={pendingW}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d+$/.test(val)) {
                setPendingW(val);
              }
            }}
            onBlur={() => {
              if (pendingW === "" || isNaN(Number(pendingW))) {
                setPendingW(currentW);
              }
            }}
            className="col-span-3 h-8"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <span className="text-right text-xs">Height</span>
          <Input
            type="text"
            value={pendingH}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d+$/.test(val)) {
                setPendingH(val);
              }
            }}
            onBlur={() => {
              if (pendingH === "" || isNaN(Number(pendingH))) {
                setPendingH(currentH);
              }
            }}
            className="col-span-3 h-8"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold">Anchor</span>
          <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
            {[
              { id: 'top-left', icon: '↖' }, { id: 'top', icon: '↑' }, { id: 'top-right', icon: '↗' },
              { id: 'left', icon: '←' }, { id: 'center', icon: '•' }, { id: 'right', icon: '→' },
              { id: 'bottom-left', icon: '↙' }, { id: 'bottom', icon: '↓' }, { id: 'bottom-right', icon: '↘' }
            ].map((item) => (
              <Button
                key={item.id}
                variant={anchor === item.id ? "default" : "outline"}
                className="h-8 p-0 text-xs aspect-square"
                onClick={() => setAnchor(item.id as any)}
              >
                {item.icon}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
        <Button onClick={onConfirm}>Đồng ý</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const PixelGridConverter = () => {
  const [masterPalette, setMasterPalette] = useState<string[]>(loadSavedPalette);
  const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
  const [editColorValue, setEditColorValue] = useState("");

  const [levelIndices, setLevelIndices] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("pixel-grid-level-indices");
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set();
  });

  const [gridData, setGridData] = useState<GridData | null>(null);
  const [gridSize, setGridSize] = useState(() => {
    return parseInt(localStorage.getItem("pixel-grid-size") || "64") || 64;
  });
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState(1);
  const [originalSize, setOriginalSize] = useState<{ width: number, height: number } | null>(null);
  const [autoTrim, setAutoTrim] = useState(() => localStorage.getItem("pixel-grid-auto-trim") !== "false");

  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [addingToCol, setAddingToCol] = useState<number | null>(null);
  const [editingShooter, setEditingShooter] = useState<{ col: number, idx: number, data: ShooterData } | null>(null);
  const [exchangingShooter, setExchangingShooter] = useState<{ col: number, idx: number } | null>(null);
  const [mcDialogAmmo, setMcDialogAmmo] = useState(40);
  const [updateMcDialogAmmo, setUpdateMcDialogAmmo] = useState(0);
  const [connectingFrom, setConnectingFrom] = useState<{ col: number, idx: number, node: 'left' | 'right' } | null>(null);

  const handleNodeClick = (col: number, idx: number, node: 'left' | 'right') => {
    if (!connectingFrom) {
      setConnectingFrom({ col, idx, node });
      toast.info("Chọn node để kết nối");
    } else {
      // Check if adjacent column or same column
      const isAdjacent = Math.abs(col - connectingFrom.col) === 1;
      const isSameCol = col === connectingFrom.col;
      
      // If adjacent, must be opposite nodes (right to left or left to right)
      const isCorrectAdjacent = isAdjacent && (
        (connectingFrom.node === 'right' && node === 'left' && col === connectingFrom.col + 1) ||
        (connectingFrom.node === 'left' && node === 'right' && col === connectingFrom.col - 1)
      );

      // If same column, can be any nodes but not the same shooter
      const isCorrectSameCol = isSameCol && (idx !== connectingFrom.idx);

      if (isCorrectAdjacent || isCorrectSameCol) {
        const id1 = levelData?.QueueGroup.shooterQueues[connectingFrom.col].shooters[connectingFrom.idx].id;
        const id2 = levelData?.QueueGroup.shooterQueues[col].shooters[idx].id;
        
        if (id1 !== undefined && id2 !== undefined) {
          // Check if these specific nodes are already connected
          const isNode1Connected = levelData?.ConnectedShooters.Connections.some(c => 
            (c.Shooters[0] === id1 && c.Nodes?.[0] === connectingFrom.node) || 
            (c.Shooters[1] === id1 && c.Nodes?.[1] === connectingFrom.node)
          );
          const isNode2Connected = levelData?.ConnectedShooters.Connections.some(c => 
            (c.Shooters[0] === id2 && c.Nodes?.[0] === node) || 
            (c.Shooters[1] === id2 && c.Nodes?.[1] === node)
          );

          if (isNode1Connected || isNode2Connected) {
            toast.error("Một node không thể kết nối vào 2 node khác");
            setConnectingFrom(null);
            return;
          }

          setLevelData(prev => {
            if (!prev) return null;
            const next = { ...prev };
            const connections = [...next.ConnectedShooters.Connections];
            
            const newId = connections.length === 0 ? 0 : Math.max(0, ...connections.map(c => c.Id)) + 1;
            connections.push({ 
              Id: newId, 
              Shooters: [id1, id2],
              Nodes: [connectingFrom.node, node]
            });
            next.ConnectedShooters = { Connections: connections };
            return next;
          });
          toast.success("Đã kết nối!");
        }
      } else {
        toast.error("Kết nối không hợp lệ. Cần kết nối node Trái với node Phải của cột bên cạnh, hoặc kết nối trong cùng một cột.");
      }
      setConnectingFrom(null);
    }
  };

  const deleteConnection = (id: number) => {
    setLevelData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      next.ConnectedShooters = {
        Connections: next.ConnectedShooters.Connections.filter(c => c.Id !== id)
      };
      return next;
    });
    toast.success("Đã xóa kết nối");
  };

  const calculateRemainingColors = useCallback(() => {
    if (!gridData) return {};
    const counts: Record<number, number> = {};
    gridData.grid.forEach(row => {
      row.forEach(mat => {
        if (mat >= 0) {
          counts[mat] = (counts[mat] || 0) + 1;
        }
      });
    });

    // Subtract ammo from shooters
    if (levelData) {
      levelData.QueueGroup.shooterQueues.forEach(q => {
        q.shooters.forEach(s => {
          if (s.material >= 0) {
            counts[s.material] = (counts[s.material] || 0) - s.ammo;
          }
        });
      });
    }

    return counts;
  }, [gridData, levelData]);

  const deleteShooter = (colIdx: number, shooterIdx: number) => {
    const shooter = levelData?.QueueGroup.shooterQueues[colIdx].shooters[shooterIdx];
    if (!shooter) return;
    const shooterId = shooter.id;

    setLevelData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      const queue = [...next.QueueGroup.shooterQueues];
      const shooters = [...queue[colIdx].shooters];
      shooters.splice(shooterIdx, 1);
      queue[colIdx] = { shooters };
      next.QueueGroup = { shooterQueues: queue };

      // Remove from SurpriseShooters
      next.SurpriseShooters = {
        Shooters: next.SurpriseShooters.Shooters.filter((id) => id !== shooterId),
      };

      // Remove from Locks
      next.Locks = {
        Shooters: next.Locks.Shooters.filter((id) => id !== shooterId),
      };

      // Remove connections
      next.ConnectedShooters = {
        Connections: next.ConnectedShooters.Connections.filter(
          (c) => !c.Shooters.includes(shooterId)
        ),
      };

      return next;
    });
  };

  const handleExchange = (col: number, idx: number) => {
    if (!exchangingShooter) {
      setExchangingShooter({ col, idx });
      toast.info("Chọn shooter tiếp theo để hoán đổi vị trí");
    } else {
      const src = exchangingShooter;
      const target = { col, idx };
      
      if (src.col === target.col && src.idx === target.idx) {
        setExchangingShooter(null);
        return;
      }

      setLevelData(prev => {
        if (!prev) return null;
        const next = { ...prev };
        const queues = next.QueueGroup.shooterQueues.map(q => ({ shooters: [...q.shooters] }));
        
        const srcShooter = queues[src.col].shooters[src.idx];
        const targetShooter = queues[target.col].shooters[target.idx];
        
        // Swap
        queues[src.col].shooters[src.idx] = { ...targetShooter };
        queues[target.col].shooters[target.idx] = { ...srcShooter };
        
        next.QueueGroup = { shooterQueues: queues };

        // Auto delete connections for BOTH shooters
        const id1 = srcShooter.id;
        const id2 = targetShooter.id;
        next.ConnectedShooters = {
          Connections: next.ConnectedShooters.Connections.filter(c => 
            !c.Shooters.includes(id1) && !c.Shooters.includes(id2)
          )
        };
        
        return next;
      });
      
      setExchangingShooter(null);
      toast.success("Đã hoán đổi vị trí và xóa kết nối");
    }
  };

  const handleInsertExchange = (col: number, positionIdx: number) => {
    if (!exchangingShooter) return;

    const src = exchangingShooter;
    
    setLevelData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      const queues = next.QueueGroup.shooterQueues.map(q => ({ shooters: [...q.shooters] }));
      
      const [srcShooter] = queues[src.col].shooters.splice(src.idx, 1);
      
      // Calculate insertion index. If inserting in the same column after the source, index might shift
      let insertIdx = positionIdx;
      if (src.col === col && src.idx < positionIdx) {
        insertIdx = positionIdx - 1;
      }
      
      queues[col].shooters.splice(insertIdx, 0, srcShooter);
      
      next.QueueGroup = { shooterQueues: queues };

      // Auto delete connections for the moved shooter
      const movedId = srcShooter.id;
      next.ConnectedShooters = {
        Connections: next.ConnectedShooters.Connections.filter(c => 
          !c.Shooters.includes(movedId)
        )
      };
      
      return next;
    });

    setExchangingShooter(null);
    toast.success("Đã chèn và xóa kết nối");
  };
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastClickedCell, setLastClickedCell] = useState<{ x: number; y: number } | null>(null);

  // Drag selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  const [swappingColor, setSwappingColor] = useState<number | null>(null);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [paletteName, setPaletteName] = useState("");

  const [physicalWidth, setPhysicalWidth] = useState(() => {
    return parseFloat(localStorage.getItem("pixel-grid-physical-width") || "10") || 10;
  });
  const [physicalHeight, setPhysicalHeight] = useState(() => {
    return parseFloat(localStorage.getItem("pixel-grid-physical-height") || "10") || 10;
  });
  const [healthValue, setHealthValue] = useState(100);
  const [manualPath, setManualPath] = useState(() => localStorage.getItem("pixel-grid-manual-path") || "");
  const [levelIndex, setLevelIndex] = useState(() => {
    return parseInt(localStorage.getItem("pixel-grid-level-index") || "0") || 0;
  });
  
  // New Level Dialog
  const [showNewLevelDialog, setShowNewLevelDialog] = useState(false);
  const [newLevelW, setNewLevelW] = useState(64);
  const [newLevelH, setNewLevelH] = useState(64);
  const [newLevelBgId, setNewLevelBgId] = useState(-1);

  const [selectedPaletteId, setSelectedPaletteId] = useState<number | null>(() => {
    const saved = localStorage.getItem("pixel-grid-selected-palette-id");
    return saved !== null ? parseInt(saved) : null;
  });

  // Health and Merge data
  const [healthMap, setHealthMap] = useState<Map<string, number>>(new Map());
  const [mergedBlocks, setMergedBlocks] = useState<Array<{ x: number, y: number, w: number, h: number, material: number, health: number }>>([]);

  // New features state
  const [keys, setKeys] = useState<Array<{ points: GridPointData[] }>>([]);
  const [surprisePixels, setSurprisePixels] = useState<Set<string>>(new Set());
  const [pixelPipes, setPixelPipes] = useState<Array<{ points: GridPointData[], queue: PixelPipePixelGroupData[] }>>([]);
  const [gates, setGates] = useState<Array<{ 
    points: GridPointData[], 
    headPoints: GridPointData[],
    direction: number, 
    length: number, 
    material: number, 
    count: number 
  }>>([]);

  const [pipeQueue, setPipeQueue] = useState<PixelPipePixelGroupData[]>([]);
  const [pipeQueueMaterial, setPipeQueueMaterial] = useState<number>(0);
  const [pipeQueueCount, setPipeQueueCount] = useState<number>(10);
  const [isBrushMode, setIsBrushMode] = useState(false);
  const [brushColorId, setBrushColorId] = useState<number | null>(null);
  const [brushType, setBrushType] = useState<'brush' | 'fill'>('brush');
  const [brushAction, setBrushAction] = useState<'add' | 'remove'>('add');
  const [isRectDrag, setIsRectDrag] = useState(false);
  const originalGridRef = useRef<number[][] | null>(null);

  const [editingPipeGroup, setEditingPipeGroup] = useState<{ pipeIdx: number, groupIdx: number } | null>(null);
  const [editingNewPipeGroup, setEditingNewPipeGroup] = useState<number | null>(null);
  const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);
  const [editingGateColorIdx, setEditingGateColorIdx] = useState<number | null>(null);
  const [replacingColorId, setReplacingColorId] = useState<number | null>(null);

  const [pendingCanvasW, setPendingCanvasW] = useState(64);
  const [pendingCanvasH, setPendingCanvasH] = useState(64);
  const [canvasAnchor, setCanvasAnchor] = useState<'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'>('center');
  const [showCanvasSizeDialog, setShowCanvasSizeDialog] = useState(false);
  const [showResetPaletteDialog, setShowResetPaletteDialog] = useState(false);

  const [editingGateIdx, setEditingGateIdx] = useState<number | null>(null);
  const [newGateDirection, setNewGateDirection] = useState<number>(FacingDirection.Right);
  const [newGateLength, setNewGateLength] = useState<number>(5);
  const [newGateCount, setNewGateCount] = useState<number>(10);
  const [newGateMaterial, setNewGateMaterial] = useState<number>(0);
  const [newGateHeadSize, setNewGateHeadSize] = useState<number>(2);

  // Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushToHistory = useCallback((currentGrid: number[][], currentBlocks: any[], currentHealth: Map<string, number>, currentKeys: any[], currentSurprise: Set<string>, currentPipes: any[], currentGates: any[]) => {
    const state = JSON.stringify({
      grid: currentGrid,
      blocks: currentBlocks,
      health: Array.from(currentHealth.entries()),
      keys: currentKeys,
      surprise: Array.from(currentSurprise),
      pipes: currentPipes,
      gates: currentGates
    });

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => {
      const next = prev + 1;
      return next > 49 ? 49 : next;
    });
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = JSON.parse(history[historyIndex - 1]);
      setGridData(prev => prev ? { ...prev, grid: prevState.grid } : null);
      setMergedBlocks(prevState.blocks);
      setHealthMap(new Map(prevState.health));
      setKeys(prevState.keys);
      setSurprisePixels(new Set(prevState.surprise));
      setPixelPipes(prevState.pipes);
      setGates(prevState.gates);
      setHistoryIndex(historyIndex - 1);
      toast.info("Undo");
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = JSON.parse(history[historyIndex + 1]);
      setGridData(prev => prev ? { ...prev, grid: nextState.grid } : null);
      setMergedBlocks(nextState.blocks);
      setHealthMap(new Map(nextState.health));
      setKeys(nextState.keys);
      setSurprisePixels(new Set(nextState.surprise));
      setPixelPipes(nextState.pipes);
      setGates(nextState.gates);
      setHistoryIndex(historyIndex + 1);
      toast.info("Redo");
    }
  };

  const commitChange = useCallback(() => {
    if (gridData) {
      pushToHistory(gridData.grid, mergedBlocks, healthMap, keys, surprisePixels, pixelPipes, gates);
    }
  }, [gridData, mergedBlocks, healthMap, keys, surprisePixels, pixelPipes, gates, pushToHistory]);

  const replaceGlobalColor = (oldId: number, newId: number) => {
    if (!gridData || oldId === newId) return;
    commitChange();

    // 1. Update Grid
    const newGrid = gridData.grid.map(row => row.map(cell => cell === oldId ? newId : cell));
    
    // 2. Update Blocks
    const newBlocks = mergedBlocks.map(b => b.material === oldId ? { ...b, material: newId } : b);
    
    // 3. Update Keys
    const newKeys = keys.map(k => k.material === oldId ? { ...k, material: newId } : k);
    
    // 4. Update Pipes
    const newPipes = pixelPipes.map(p => {
      const newQueue = p.queue.map(q => q.material === oldId ? { ...q, material: newId } : q);
      return { ...p, queue: newQueue };
    });
    
    // 5. Update Gates
    const newGates = gates.map(g => g.material === oldId ? { ...g, material: newId } : g);

    setGridData({ ...gridData, grid: newGrid });
    setMergedBlocks(newBlocks);
    setKeys(newKeys);
    setPixelPipes(newPipes);
    setGates(newGates);
    
    setReplacingColorId(null);
    toast.success(`Đã thay thế màu ID:${oldId} bằng ID:${newId}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Initial history
  useEffect(() => {
    if (gridData && history.length === 0) {
      const state = JSON.stringify({
        grid: gridData.grid,
        blocks: mergedBlocks,
        health: Array.from(healthMap.entries()),
        keys: keys,
        surprise: Array.from(surprisePixels),
        pipes: pixelPipes,
        gates: gates
      });
      setHistory([state]);
      setHistoryIndex(0);
    }
    if (gridData) {
      setPendingCanvasW(gridData.width);
      setPendingCanvasH(gridData.height);
    }
  }, [gridData]);

  const getColorCounts = useCallback(() => {
    const counts = new Map<number, number>();
    if (!gridData) return counts;

    const { grid, width, height } = gridData;
    const covered = new Set<string>();

    // Mark cells covered by keys
    keys.forEach(k => k.points.forEach(p => {
      const internalY = height - 1 - p.Y;
      covered.add(`${p.X},${internalY}`);
    }));

    // Mark cells covered by pipes
    pixelPipes.forEach(p => p.points.forEach(pt => {
      const internalY = height - 1 - pt.Y;
      covered.add(`${pt.X},${internalY}`);
    }));

    // Mark cells covered by gates
    gates.forEach(g => g.points.forEach(pt => {
      const internalY = height - 1 - pt.Y;
      covered.add(`${pt.X},${internalY}`);
    }));

    // Mark cells covered by merged blocks
    mergedBlocks.forEach(block => {
      for (let dy = 0; dy < block.h; dy++) {
        for (let dx = 0; dx < block.w; dx++) {
          covered.add(`${block.x + dx},${block.y + dy}`);
        }
      }
      // Add health to count
      counts.set(block.material, (counts.get(block.material) || 0) + block.health);
    });

    // Count single pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const material = grid[y][x];
        if (material !== -1 && !covered.has(`${x},${y}`)) {
          counts.set(material, (counts.get(material) || 0) + 1);
        }
      }
    }

    // Add pipe counts
    pixelPipes.forEach(p => {
      p.queue.forEach(q => {
        counts.set(q.Material, (counts.get(q.Material) || 0) + q.Count);
      });
    });

    // Add gate counts
    gates.forEach(g => {
      counts.set(g.material, (counts.get(g.material) || 0) + g.count);
    });

    return counts;
  }, [gridData, keys, pixelPipes, gates, mergedBlocks]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("pixel-grid-level-indices", JSON.stringify(Array.from(levelIndices)));
  }, [levelIndices]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-level-index", levelIndex.toString());
  }, [levelIndex]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-size", gridSize.toString());
  }, [gridSize]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-physical-width", physicalWidth.toString());
    localStorage.setItem("pixel-grid-physical-height", physicalHeight.toString());
  }, [physicalWidth, physicalHeight]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-auto-trim", autoTrim.toString());
  }, [autoTrim]);

  useEffect(() => {
    if (selectedPaletteId !== null) {
      localStorage.setItem("pixel-grid-selected-palette-id", selectedPaletteId.toString());
    } else {
      localStorage.removeItem("pixel-grid-selected-palette-id");
    }
  }, [selectedPaletteId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(masterPalette));
  }, [masterPalette]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-keys", JSON.stringify(keys));
  }, [keys]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-surprise-pixels", JSON.stringify(Array.from(surprisePixels)));
  }, [surprisePixels]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-pixel-pipes", JSON.stringify(pixelPipes));
  }, [pixelPipes]);

  useEffect(() => {
    localStorage.setItem("pixel-grid-gates", JSON.stringify(gates));
  }, [gates]);

  // Auto-assign health from block when selected
  useEffect(() => {
    if (selectedCells.size === 1) {
      const key = Array.from(selectedCells)[0] as string;
      const [x, y] = key.split(",").map(Number);
      const block = getBlockAt(x, y);
      if (block) {
        setHealthValue(block.health);
        if (block.material >= 0) setSelectedPaletteId(block.material);
      } else {
        const displayY = toDisplayY(y);
        const health = healthMap.get(`${x},${displayY}`);
        if (health !== undefined) setHealthValue(health);
        
        const materialId = gridData.grid[y][x];
        if (materialId >= 0) setSelectedPaletteId(materialId);
      }
    }
  }, [selectedCells]);

  // Level data load/save
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const levelFileInputRef = useRef<HTMLInputElement>(null);
  const paletteFileRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const levelIdxArray = Array.from(levelIndices).sort((a, b) => (a as number) - (b as number));

  const getGridDimensions = useCallback(() => {
    if (imageAspect >= 1) {
      return { w: gridSize, h: Math.max(1, Math.round(gridSize / imageAspect)) };
    }
    return { w: Math.max(1, Math.round(gridSize * imageAspect)), h: gridSize };
  }, [gridSize, imageAspect]);

  const toDisplayY = useCallback((internalY: number) => {
    const h = gridData?.height || getGridDimensions().h;
    return h - 1 - internalY;
  }, [gridData, getGridDimensions]);

  const applyColorToSelection = useCallback((materialId: number, targetCells?: Set<string>, forcedMode?: 'add' | 'remove') => {
    const cellsToApply = targetCells || selectedCells;
    if (cellsToApply.size === 0) return;

    if (!targetCells) commitChange();

    setGridData(prev => {
      if (!prev) return null;
      const newGrid = prev.grid.map((row) => [...row]);
      
      cellsToApply.forEach((key: string) => {
        const [x, y] = key.split(",").map(Number);
        if (y >= 0 && y < newGrid.length && x >= 0 && x < newGrid[0].length) {
          if (materialId !== -2) {
            newGrid[y][x] = materialId;
          }
        }
      });
      return { ...prev, grid: newGrid };
    });

    setSurprisePixels(prev => {
      const next = new Set(prev);
      
      let mode: 'add' | 'remove' = forcedMode || 'add';
      if (!forcedMode && materialId === -2 && cellsToApply.size > 0) {
        const firstKey = Array.from(cellsToApply)[0] as string;
        const [fx, fy] = firstKey.split(",").map(Number);
        const fDisplayY = toDisplayY(fy);
        if (prev.has(`${fx},${fDisplayY}`)) {
          mode = 'remove';
        }
      }

      cellsToApply.forEach((key: string) => {
        const [x, y] = key.split(",").map(Number);
        const displayY = toDisplayY(y);
        if (materialId === -2) {
          if (mode === 'add') {
            next.add(`${x},${displayY}`);
          } else {
            next.delete(`${x},${displayY}`);
          }
        } else {
          next.delete(`${x},${displayY}`);
        }
      });
      return next;
    });

    setMergedBlocks(prev => {
      const next = prev.map(b => {
        let modified = false;
        const updatedBlock = { ...b };
        cellsToApply.forEach((key: string) => {
          const [x, y] = key.split(",").map(Number);
          const displayY = toDisplayY(y);
          if (x >= b.x && x < b.x + b.w && displayY >= b.y && displayY < b.y + b.h) {
            updatedBlock.material = materialId;
            modified = true;
          }
        });
        return modified ? updatedBlock : b;
      });
      
      // If material was changed in a block, we also need to update the grid for all cells in that block
      // This is handled by the next effect or by re-applying to all cells in the block
      next.forEach(b => {
        const isAffected = Array.from(cellsToApply).some(key => {
          const [x, y] = (key as string).split(",").map(Number);
          const displayY = toDisplayY(y);
          return x >= b.x && x < b.x + b.w && displayY >= b.y && displayY < b.y + b.h;
        });

        if (isAffected && materialId !== -2) {
          setGridData(current => {
            if (!current) return null;
            const g = current.grid.map(r => [...r]);
            for (let dy = 0; dy < b.h; dy++) {
              for (let dx = 0; dx < b.w; dx++) {
                const iy = current.height - 1 - (b.y + dy);
                if (iy >= 0 && iy < g.length && b.x + dx >= 0 && b.x + dx < g[0].length) {
                  g[iy][b.x + dx] = materialId;
                }
              }
            }
            return { ...current, grid: g };
          });
        }
      });

      return next.filter(b => b.material !== -1);
    });
  }, [selectedCells, commitChange, toDisplayY]);

  const closestPaletteId = (hex: string, paletteIds: number[], palette: string[]): number => {
    const [r, g, b] = parseHex(hex);
    let bestId = paletteIds[0];
    let bestDist = Infinity;
    for (const id of paletteIds) {
      const [pr, pg, pb] = parseHex(palette[id]);
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < bestDist) { bestDist = d; bestId = id; }
    }
    return bestId;
  };

  const trimTransparent = (imageData: ImageData) => {
    const { data, width, height } = imageData;
    let top = height, left = width, bottom = 0, right = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = data[(y * width + x) * 4 + 3];
        if (a >= 128) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    if (top > bottom || left > right) return { x: 0, y: 0, w: width, h: height };
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  };

  const processImage = useCallback(
    (src: string, paletteIds: number[], palette: string[]) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = img.width;
        tmpCanvas.height = img.height;
        const tmpCtx = tmpCanvas.getContext("2d")!;
        tmpCtx.drawImage(img, 0, 0);
        const fullData = tmpCtx.getImageData(0, 0, img.width, img.height);

        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        if (autoTrim) {
          const bounds = trimTransparent(fullData);
          srcX = bounds.x; srcY = bounds.y; srcW = bounds.w; srcH = bounds.h;
        }

        const aspect = srcW / srcH;
        setImageAspect(aspect);
        setOriginalSize({ width: srcW, height: srcH });

        let gw: number, gh: number;
        if (aspect >= 1) { gw = gridSize; gh = Math.max(1, Math.round(gridSize / aspect)); }
        else { gh = gridSize; gw = Math.max(1, Math.round(gridSize * aspect)); }

        canvas.width = gw;
        canvas.height = gh;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, gw, gh);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, gw, gh);
        const imageData = ctx.getImageData(0, 0, gw, gh);
        const { data } = imageData;

        const usePalette = paletteIds.length > 0;
        const grid: number[][] = [];

        for (let y = 0; y < gh; y++) {
          const row: number[] = [];
          for (let x = 0; x < gw; x++) {
            const i = (y * gw + x) * 4;
            const a = data[i + 3];
            if (a < 128) { row.push(-1); }
            else {
              const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
              if (usePalette) row.push(closestPaletteId(hex, paletteIds, palette));
              else row.push(closestPaletteId(hex, palette.map((_, idx) => idx), palette));
            }
          }
          grid.push(row);
        }

        setGridData({ grid, width: gw, height: gh });
        setMergedBlocks([]);
        setHealthMap(new Map());
      };
      img.src = src;
    },
    [gridSize, autoTrim]
  );

  useEffect(() => {
    if (imageSrc) processImage(imageSrc, levelIdxArray, masterPalette);
  }, [imageSrc, levelIdxArray.join(","), gridSize, processImage, masterPalette]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startEditColor = (idx: number) => {
    setEditingColorIdx(idx);
    setEditColorValue(masterPalette[idx]);
  };

  const confirmEditColor = () => {
    if (editingColorIdx === null) return;
    const val = editColorValue.startsWith("#") ? editColorValue : `#${editColorValue}`;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const newPalette = [...masterPalette];
      newPalette[editingColorIdx] = val.toLowerCase();
      setMasterPalette(newPalette);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPalette));
    }
    setEditingColorIdx(null);
  };

  const toggleLevelColor = (idx: number) => {
    setLevelIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    setSelectedPaletteId(idx);
  };

  const selectAllUsedColors = () => {
    if (!gridData) return;
    const used = getUsedMaterialIds();
    const next = new Set(levelIndices);
    used.forEach(id => {
      if (id >= 0) next.add(id);
    });
    setLevelIndices(next);
  };

  const savePalette = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(masterPalette));

  const exportPaletteFile = async () => {
    const json = JSON.stringify({ name: paletteName || "My Palette", colors: masterPalette }, null, 2);
    const fileName = `${paletteName || "palette"}.json`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        toast.success(`Đã lưu palette: ${handle.name}`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Save palette picker failed:", err);
      }
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã chuẩn bị file palette: ${fileName}`);
  };

  const loadPaletteFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = ev.target?.result as string;
        const data = JSON.parse(result);
        let colors: string[] | null = null;

        if (Array.isArray(data)) {
          colors = data;
        } else if (data.colors && Array.isArray(data.colors)) {
          colors = data.colors;
        }

        if (colors && colors.length > 0) {
          const newPalette = colors.filter(c => typeof c === "string");
          setMasterPalette(newPalette);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newPalette));
          toast.success(`Đã load thành công palette với ${newPalette.length} màu!`);
        } else {
          toast.error("Định dạng file palette không hợp lệ. Cần một array màu hoặc object có field 'colors'.");
        }
      } catch (err) {
        console.error("Load palette failed:", err);
        toast.error("Lỗi khi đọc file palette. Vui lòng kiểm tra định dạng JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // --- Drag selection ---
  const handleCellMouseDown = (x: number, y: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (isBrushMode && brushColorId !== null) {
      commitChange();
      
      if (brushType === 'fill') {
        floodFill(x, y, brushColorId);
        setSelectedCells(new Set());
        return;
      }
      
      const rectMode = e.shiftKey;
      setIsRectDrag(rectMode);
      
      if (rectMode && gridData) {
        originalGridRef.current = gridData.grid.map(row => [...row]);
      }

      // Determine brush action (add or remove) for Surprise pixels
      if (brushColorId === -2) {
        const displayY = toDisplayY(y);
        const isAlreadySurprise = surprisePixels.has(`${x},${displayY}`);
        setBrushAction(isAlreadySurprise ? 'remove' : 'add');
        if (!rectMode) {
          applyColorToSelection(-2, new Set([`${x},${y}`]), isAlreadySurprise ? 'remove' : 'add');
        }
      } else {
        setBrushAction('add');
        if (!rectMode) {
          applyColorToSelection(brushColorId, new Set([`${x},${y}`]));
        }
      }
      
      setIsDragging(true);
      setDragStart({ x, y });
      setDragEnd({ x, y });
      return;
    }
    // Normal selection logic
    if (e.shiftKey && lastClickedCell) {
      // Shift+click: rect from last to current
      const x1 = Math.min(lastClickedCell.x, x), y1 = Math.min(lastClickedCell.y, y);
      const x2 = Math.max(lastClickedCell.x, x), y2 = Math.max(lastClickedCell.y, y);
      const cells = new Set(selectedCells);
      for (let cy = y1; cy <= y2; cy++)
        for (let cx = x1; cx <= x2; cx++) cells.add(`${cx},${cy}`);
      setSelectedCells(cells);
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: toggle point
      const key = `${x},${y}`;
      const cells = new Set(selectedCells);
      if (cells.has(key)) cells.delete(key); else cells.add(key);
      setSelectedCells(cells);
      setLastClickedCell({ x, y });
    } else {
      // Start drag
      setIsDragging(true);
      setDragStart({ x, y });
      setDragEnd({ x, y });
      setSelectedCells(new Set([`${x},${y}`]));
      setLastClickedCell({ x, y });
    }
  };

  const handleCellMouseEnter = (x: number, y: number, e?: React.MouseEvent) => {
    setHoveredCell({ x, y });
    if (isDragging && dragStart) {
      setDragEnd({ x, y });
      if (isBrushMode && brushColorId !== null) {
        if (brushType === 'brush') {
          if (!isRectDrag) {
            applyColorToSelection(brushColorId, new Set([`${x},${y}`]), brushAction);
          } else if (originalGridRef.current && gridData) {
            // Live apply rectangle using the snapshot from drag start
            const x1 = Math.min(dragStart.x, x), y1 = Math.min(dragStart.y, y);
            const x2 = Math.max(dragStart.x, x), y2 = Math.max(dragStart.y, y);
            
            const newGrid = originalGridRef.current.map(row => [...row]);
            const cells = new Set<string>();
            for (let cy = y1; cy <= y2; cy++) {
              for (let cx = x1; cx <= x2; cx++) {
                if (cx >= 0 && cx < gridData.width && cy >= 0 && cy < gridData.height) {
                  if (brushColorId !== -2) {
                    newGrid[cy][cx] = brushColorId;
                  }
                  cells.add(`${cx},${cy}`);
                }
              }
            }
            setGridData(prev => prev ? { ...prev, grid: newGrid } : null);
            setSelectedCells(cells);
          }
        }
      } else {
        // Build selection from dragStart to current
        const x1 = Math.min(dragStart.x, x), y1 = Math.min(dragStart.y, y);
        const x2 = Math.max(dragStart.x, x), y2 = Math.max(dragStart.y, y);
        const cells = new Set<string>();
        for (let cy = y1; cy <= y2; cy++)
          for (let cx = x1; cx <= x2; cx++) cells.add(`${cx},${cy}`);
        setSelectedCells(cells);
      }
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      if (isBrushMode && brushColorId !== null && brushType === 'brush' && isRectDrag && dragStart && dragEnd) {
        const x1 = Math.min(dragStart.x, dragEnd.x), y1 = Math.min(dragStart.y, dragEnd.y);
        const x2 = Math.max(dragStart.x, dragEnd.x), y2 = Math.max(dragStart.y, dragEnd.y);
        const cells = new Set<string>();
        for (let cy = y1; cy <= y2; cy++)
          for (let cx = x1; cx <= x2; cx++) cells.add(`${cx},${cy}`);
        
        // If we were in rect drag mode, we need to apply the final selection
        // For Surprise pixels, we use the brushAction we determined at mouseDown
        applyColorToSelection(brushColorId, cells, brushColorId === -2 ? brushAction : undefined);
      }
      
      if (isBrushMode) {
        setSelectedCells(new Set());
      }
      
      setIsDragging(false);
      setIsRectDrag(false);
      originalGridRef.current = null;
    }
  }, [isDragging, isBrushMode, brushColorId, brushType, isRectDrag, dragStart, dragEnd, brushAction, applyColorToSelection]);

  const floodFill = (startX: number, startY: number, newColor: number) => {
    if (!gridData) return;
    const targetColor = gridData.grid[startY][startX];
    if (targetColor === newColor) return;

    const cellsToFill = new Set<string>();
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;

    visited.add(key(startX, startY));

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      cellsToFill.add(key(x, y));

      const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < gridData.width && ny >= 0 && ny < gridData.height) {
          if (!visited.has(key(nx, ny)) && gridData.grid[ny][nx] === targetColor) {
            visited.add(key(nx, ny));
            queue.push([nx, ny]);
          }
        }
      }
    }

    applyColorToSelection(newColor, cellsToFill);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const swapColor = (oldId: number, newId: number) => {
    if (!gridData) return;
    commitChange();
    const newGrid = gridData.grid.map((row) => row.map((c) => (c === oldId ? newId : c)));
    const newMergedBlocks = mergedBlocks.map((b) => (b.material === oldId ? { ...b, material: newId } : b));
    
    // If swapped to -1, remove those blocks
    const filteredBlocks = newMergedBlocks.filter(b => b.material !== -1);

    setGridData({ ...gridData, grid: newGrid });
    setMergedBlocks(filteredBlocks);
    setSwappingColor(null);
  };

  const clearLevelColors = () => setLevelIndices(new Set());

  const isInSelection = (x: number, y: number) => selectedCells.has(`${x},${y}`);

  const getUsedMaterialIds = (): number[] => {
    if (!gridData) return [];
    const ids = new Set<number>();
    gridData.grid.forEach((row) => row.forEach((id) => { if (id >= 0) ids.add(id); }));
    return Array.from(ids).sort((a, b) => a - b);
  };

  const createNewLevel = () => {
    commitChange();
    const grid = Array.from({ length: newLevelH }, () => Array(newLevelW).fill(newLevelBgId));
    setGridData({ grid, width: newLevelW, height: newLevelH });
    setMergedBlocks([]);
    setHealthMap(new Map());
    setKeys([]);
    setSurprisePixels(new Set());
    setPixelPipes([]);
    setGates([]);
    setShowNewLevelDialog(false);
    setImageSrc(null);
    setOriginalSize(null);
    toast.success("Đã tạo level mới!");
  };

  const resizeGrid = (newW: number, newH: number, anchor: 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right' = 'center') => {
    if (!gridData) return;
    commitChange();
    const oldW = gridData.width;
    const oldH = gridData.height;
    const newGrid = Array.from({ length: newH }, () => Array(newW).fill(-1));

    let offsetX = 0;
    let offsetY = 0;

    switch (anchor) {
      case 'top-left':
        offsetX = 0;
        offsetY = 0;
        break;
      case 'top':
        offsetX = Math.floor((newW - oldW) / 2);
        offsetY = 0;
        break;
      case 'top-right':
        offsetX = newW - oldW;
        offsetY = 0;
        break;
      case 'left':
        offsetX = 0;
        offsetY = Math.floor((newH - oldH) / 2);
        break;
      case 'center':
        offsetX = Math.floor((newW - oldW) / 2);
        offsetY = Math.floor((newH - oldH) / 2);
        break;
      case 'right':
        offsetX = newW - oldW;
        offsetY = Math.floor((newH - oldH) / 2);
        break;
      case 'bottom-left':
        offsetX = 0;
        offsetY = newH - oldH;
        break;
      case 'bottom':
        offsetX = Math.floor((newW - oldW) / 2);
        offsetY = newH - oldH;
        break;
      case 'bottom-right':
        offsetX = newW - oldW;
        offsetY = newH - oldH;
        break;
    }

    for (let y = 0; y < oldH; y++) {
      for (let x = 0; x < oldW; x++) {
        const ny = y + offsetY;
        const nx = x + offsetX;
        if (ny >= 0 && ny < newH && nx >= 0 && nx < newW) {
          newGrid[ny][nx] = gridData.grid[y][x];
        }
      }
    }

    const adjustPoints = (pts: GridPointData[]) => pts.map(p => {
      const internalY = oldH - 1 - p.Y;
      const newInternalY = internalY + offsetY;
      const newDisplayY = newH - 1 - newInternalY;
      return { X: p.X + offsetX, Y: newDisplayY };
    });

    setMergedBlocks(prev => prev.map(b => {
      const internalY = oldH - 1 - b.y;
      const newInternalY = internalY + offsetY;
      const newDisplayY = newH - 1 - newInternalY;
      return { ...b, x: b.x + offsetX, y: newDisplayY };
    }));

    setKeys(prev => prev.map(k => ({ points: adjustPoints(k.points) })));
    
    const newSurprise = new Set<string>();
    surprisePixels.forEach(s => {
      const [x, y] = s.split(",").map(Number);
      const internalY = oldH - 1 - y;
      const newInternalY = internalY + offsetY;
      const newDisplayY = newH - 1 - newInternalY;
      const nx = x + offsetX;
      if (nx >= 0 && nx < newW && newDisplayY >= 0 && newDisplayY < newH) {
        newSurprise.add(`${nx},${newDisplayY}`);
      }
    });
    setSurprisePixels(newSurprise);

    setPixelPipes(prev => prev.map(p => ({ ...p, points: adjustPoints(p.points) })));
    setGates(prev => prev.map(g => ({ ...g, points: adjustPoints(g.points) })));

    const newHealth = new Map<string, number>();
    healthMap.forEach((v, k) => {
      const [x, y] = k.split(",").map(Number);
      const internalY = oldH - 1 - y;
      const newInternalY = internalY + offsetY;
      const newDisplayY = newH - 1 - newInternalY;
      const nx = x + offsetX;
      if (nx >= 0 && nx < newW && newDisplayY >= 0 && newDisplayY < newH) {
        newHealth.set(`${nx},${newDisplayY}`, v);
      }
    });
    setHealthMap(newHealth);

    setGridData({ grid: newGrid, width: newW, height: newH });
    toast.success(`Đã thay đổi kích thước canvas thành ${newW}x${newH}`);
  };

  const buildPixelImageData = (): PixelImageData | null => {
    if (!gridData) return null;
    let { grid, width, height } = gridData;
    let outPhysicalWidth = physicalWidth;
    let outPhysicalHeight = physicalHeight;

    let minX = 0, minY = 0;
    if (autoTrim) {
      let activeMinX = width, activeMaxX = -1, activeMinY = height, activeMaxY = -1;
      let hasAnyContent = false;

      const mark = (x: number, y: number) => {
        activeMinX = Math.min(activeMinX, x);
        activeMaxX = Math.max(activeMaxX, x);
        activeMinY = Math.min(activeMinY, y);
        activeMaxY = Math.max(activeMaxY, y);
        hasAnyContent = true;
      };

      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          if (grid[r][c] >= 0) mark(c, height - 1 - r);
        }
      }
      mergedBlocks.forEach(b => {
        mark(b.x, b.y);
        mark(b.x + b.w - 1, b.y + b.h - 1);
      });
      keys.forEach(k => k.points.forEach(p => mark(p.X, p.Y)));
      surprisePixels.forEach(s => {
        const [x, y] = (s as string).split(",").map(Number);
        mark(x, y);
      });
      pixelPipes.forEach(p => p.points.forEach(pt => mark(pt.X, pt.Y)));
      gates.forEach(g => {
        g.points.forEach(pt => mark(pt.X, pt.Y));
        if (g.headPoints) g.headPoints.forEach(pt => mark(pt.X, pt.Y));
      });

      if (hasAnyContent) {
        minX = activeMinX;
        minY = activeMinY;
        const newWidth = activeMaxX - activeMinX + 1;
        const newHeight = activeMaxY - activeMinY + 1;
        const unitW = width > 0 ? physicalWidth / width : 0;
        const unitH = height > 0 ? physicalHeight / height : 0;
        outPhysicalWidth = newWidth * unitW;
        outPhysicalHeight = newHeight * unitH;
        width = newWidth;
        height = newHeight;
      }
    }

    const pixels: PixelDataEntry[] = [];
    const pixelHealths: PixelHealthData[] = [];

    // Track which cells are already covered by a merged block or key
    const covered = new Set<string>();

    // Mark cells covered by keys (keys are stored separately)
    keys.forEach(k => {
      k.points.forEach(p => {
        const internalY = gridData.height - 1 - p.Y;
        covered.add(`${p.X},${internalY}`);
      });
    });

    // Mark cells covered by gates (gates are stored separately)
    gates.forEach(g => {
      g.points.forEach(p => {
        const internalY = gridData.height - 1 - p.Y;
        covered.add(`${p.X},${internalY}`);
      });
    });

    // Mark cells covered by pipes (pipes are stored separately)
    pixelPipes.forEach(p => {
      p.points.forEach(pt => {
        const internalY = gridData.height - 1 - pt.Y;
        covered.add(`${pt.X},${internalY}`);
      });
    });

    // Add merged blocks first
    mergedBlocks.forEach(block => {
      // Filter by levelIndices if not empty
      if (levelIndices.size > 0 && !levelIndices.has(block.material)) return;

      pixels.push({
        x: block.x - minX,
        y: block.y - minY,
        material: block.material,
        areaX: block.w,
        areaY: block.h
      });
      pixelHealths.push({
        x: block.x - minX,
        y: block.y - minY,
        health: block.health
      });
      
      // Mark cells as covered
      for (let dy = 0; dy < block.h; dy++) {
        for (let dx = 0; dx < block.w; dx++) {
          // Internal grid coordinates
          const internalY = gridData.height - 1 - (block.y + dy);
          covered.add(`${block.x + dx},${internalY}`);
        }
      }
    });

    // Add remaining individual pixels
    for (let row = 0; row < gridData.height; row++) {
      for (let col = 0; col < gridData.width; col++) {
        if (covered.has(`${col},${row}`)) continue;
        
        const materialId = grid[row][col];
        if (materialId < 0) continue;
        
        // Filter by levelIndices if not empty
        if (levelIndices.size > 0 && !levelIndices.has(materialId)) continue;
        
        const displayY = gridData.height - 1 - row;
        pixels.push({ x: col - minX, y: displayY - minY, material: materialId, areaX: 1, areaY: 1 });
        
        const health = healthMap.get(`${col},${displayY}`);
        if (health !== undefined) {
          pixelHealths.push({ x: col - minX, y: displayY - minY, health });
        }
      }
    }

    return { 
      id: levelData?.ImageId ?? levelIndex,
      width, 
      height, 
      physicalWidth: outPhysicalWidth, 
      physicalHeight: outPhysicalHeight, 
      pixels: pixels.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y), 
      pixelHealths: pixelHealths.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y),
      keys: { Keys: keys.map(k => ({ GridPoints: [...k.points].map(p => ({ X: p.X - minX, Y: p.Y - minY })).sort((a, b) => a.X !== b.X ? a.X - b.X : a.Y - b.Y) })) },
      surprisePixels: { Pixels: Array.from(surprisePixels).map(s => {
        const [x, y] = (s as string).split(",").map(Number);
        return { X: x - minX, Y: y - minY };
      }).sort((a, b) => a.X !== b.X ? a.X - b.X : a.Y - b.Y) },
      pixelPipes: { Pipes: pixelPipes.map(p => ({ GridPoints: [...p.points].map(pt => ({ X: pt.X - minX, Y: pt.Y - minY })).sort((a, b) => a.X !== b.X ? a.X - b.X : a.Y - b.Y), Queue: p.queue })) },
      gates: { Gates: gates.map(g => ({ GridPoints: [...g.headPoints].map(pt => ({ X: pt.X - minX, Y: pt.Y - minY })).sort((a, b) => a.X !== b.X ? a.X - b.X : a.Y - b.Y), Direction: g.direction, Length: g.length, Material: g.material, Count: g.count })) }
    };
  };

  const copyLevelJson = () => {
    const data = buildPixelImageData();
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => toast.success("Đã copy JSON vào clipboard!"))
      .catch(err => {
        console.error("Copy failed:", err);
        toast.error("Lỗi khi copy vào clipboard");
      });
  };

  const getDisjointConnectionCount = () => {
    if (!levelData) return 0;
    const connections = levelData.ConnectedShooters.Connections;
    if (connections.length === 0) return 0;

    const parent = new Map<number, number>();
    const find = (i: number): number => {
      if (!parent.has(i)) parent.set(i, i);
      const nodeParent = parent.get(i)!;
      if (nodeParent === i) return i;
      const root = find(nodeParent);
      parent.set(i, root);
      return root;
    };

    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    connections.forEach(conn => {
      union(conn.Shooters[0], conn.Shooters[1]);
    });

    const roots = new Set<number>();
    const nodesInConnections = new Set<number>();
    connections.forEach(conn => {
      nodesInConnections.add(conn.Shooters[0]);
      nodesInConnections.add(conn.Shooters[1]);
    });

    nodesInConnections.forEach(node => {
      roots.add(find(node));
    });

    return roots.size;
  };

  const lockCountInQueues = levelData?.QueueGroup.shooterQueues.reduce((acc, q) => acc + q.shooters.filter(s => s.material === -1).length, 0) || 0;
  const keyCountInData = keys.length;

  const saveAllData = async () => {
    // 1. Image Data
    const imageData = buildPixelImageData();
    if (!imageData) return;

    // 2. Level Data
    if (!levelData) {
      toast.error("Không có Level Data để lưu!");
      return;
    }

    // Validation (as in shooters section)
    if (lockCountInQueues !== keyCountInData) {
      toast.error(`Không thể lưu! Số lượng Lock (${lockCountInQueues}) và Key (${keyCountInData}) phải bằng nhau.`);
      return;
    }

    for (let i = 0; i < levelData.QueueGroup.shooterQueues.length; i++) {
      const queue = levelData.QueueGroup.shooterQueues[i];
      if (queue.shooters.length > 0) {
        const firstShooter = queue.shooters[0];
        if (levelData.SurpriseShooters.Shooters.includes(firstShooter.id)) {
          toast.error(`Không thể lưu! Shooter đầu tiên ở Cột ${i + 1} không được là dấu hỏi.`);
          return;
        }
      }
    }

    const { id, ImageId, Difficulty, ...rest } = levelData;
    const filteredQueues = levelData.QueueGroup.shooterQueues.filter(q => q.shooters.length > 0);
    const levelConfigData = { 
      id, 
      ImageId, 
      Difficulty, 
      ...rest, 
      QueueGroup: { shooterQueues: filteredQueues } 
    };

    const imageFileName = `Image_${imageData.id}.json`;
    const levelFileName = `Level_${levelData.id ?? 0}.json`;

    // Internal helper for individual downloads to avoid duplicating Picker Code
    const downloadJson = (data: any, fileName: string) => {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    // Download both
    downloadJson(imageData, imageFileName);
    setTimeout(() => {
      downloadJson(levelConfigData, levelFileName);
      toast.success("Đã tải xuống Image Data & Level Data");
    }, 100);
  };

  const saveLevelData = async () => {
    const data = buildPixelImageData();
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const fileName = `Image_${data.id}.json`;

    // Try to use File System Access API (showSaveFilePicker)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        toast.success(`Đã lưu file: ${handle.name}`);
        return;
      } catch (err: any) {
        // If user cancelled, just return
        if (err.name === 'AbortError') return;
        console.error("Save file picker failed:", err);
        // Fallback to traditional download if picker fails for other reasons
      }
    }

    // Fallback: traditional download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dữ liệu đã được chuẩn bị", {
      description: `File: ${fileName} đang được tải xuống.`
    });
  };

  const handleLevelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.Difficulty !== undefined) {
          const lData = json as LevelData;
          setLevelData(lData);
          if (lData.ImageId !== undefined) setLevelIndex(lData.ImageId);
          toast.success("Level Data loaded");
        } else {
          const data = json as PixelImageData;
          if (!data.width || !data.height || !Array.isArray(data.pixels)) {
            throw new Error("Invalid format");
          }
          if (data.id !== undefined) {
            setLevelIndex(data.id);
            setLevelData(prev => prev ? { ...prev, ImageId: data.id } : prev);
          }
          setPhysicalWidth(data.physicalWidth || 1);
          setPhysicalHeight(data.physicalHeight || 1);
          
          const newGrid = Array.from({ length: data.height }, () => Array(data.width).fill(-1));
          const newMergedBlocks: Array<{ x: number, y: number, w: number, h: number, material: number, health: number }> = [];
          const newHealthMap = new Map<string, number>();

          const healthLookup = new Map<string, number>();
          if (Array.isArray(data.pixelHealths)) {
            data.pixelHealths.forEach(h => {
              healthLookup.set(`${h.x},${h.y}`, h.health);
              newHealthMap.set(`${h.x},${h.y}`, h.health);
            });
          }

          data.pixels.forEach(p => {
            const internalY = data.height - 1 - p.y;
            if (p.areaX > 1 || p.areaY > 1) {
              newMergedBlocks.push({
                x: p.x,
                y: p.y,
                w: p.areaX,
                h: p.areaY,
                material: p.material,
                health: healthLookup.get(`${p.x},${p.y}`) ?? 100
              });
              for (let dy = 0; dy < p.areaY; dy++) {
                for (let dx = 0; dx < p.areaX; dx++) {
                  if (p.y + dy < data.height && p.x + dx < data.width) {
                    newGrid[data.height - 1 - (p.y + dy)][p.x + dx] = p.material;
                  }
                }
              }
            } else {
              if (internalY >= 0 && internalY < data.height && p.x >= 0 && p.x < data.width) {
                newGrid[internalY][p.x] = p.material;
              }
            }
          });

          setGridData({ grid: newGrid, width: data.width, height: data.height });
          setMergedBlocks(newMergedBlocks);
          setHealthMap(newHealthMap);
          
          if (data.keys?.Keys) {
            setKeys(data.keys.Keys.map(k => ({ points: k.GridPoints })));
          } else {
            setKeys([]);
          }

          if (data.surprisePixels?.Pixels) {
            const sp = new Set<string>();
            data.surprisePixels.Pixels.forEach(p => sp.add(`${p.X},${p.Y}`));
            setSurprisePixels(sp);
          } else {
            setSurprisePixels(new Set());
          }

          if (data.pixelPipes?.Pipes) {
            setPixelPipes(data.pixelPipes.Pipes.map(p => ({ points: p.GridPoints, queue: p.Queue })));
          } else {
            setPixelPipes([]);
          }

          if (data.gates?.Gates) {
            setGates(data.gates.Gates.map(g => ({ points: g.GridPoints, direction: g.Direction, length: g.Length, material: g.Material, count: g.Count })));
          } else {
            setGates([]);
          }

          // Auto-pick colors from loaded file
          const loadedIds = new Set<number>();
          data.pixels.forEach(p => { if (p.material >= 0) loadedIds.add(p.material); });
          if (loadedIds.size > 0) setLevelIndices(loadedIds);
          
          // Try to infer level index from filename if not in data
          if (data.id === undefined) {
            const match = file.name.match(/(?:Image|Level)_(\d+)/);
            if (match) {
              const inferredId = parseInt(match[1]);
              setLevelIndex(inferredId);
              setLevelData(prev => prev ? { ...prev, ImageId: inferredId } : prev);
            }
          }

          toast.success(`Đã load thành công level từ file: ${file.name}`);
        }
      } catch (err) {
        console.error("Load level failed:", err);
        toast.error("Lỗi khi đọc file JSON. Vui lòng kiểm tra định dạng.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadLevelData = () => {
    levelFileInputRef.current?.click();
  };

  const getMaterialColor = (id: number): string => {
    if (id < 0 || id >= masterPalette.length) return "transparent";
    return masterPalette[id];
  };

  const { w: gridW, h: gridH } = gridData
    ? { w: gridData.width, h: gridData.height }
    : getGridDimensions();

  const cellSize = (gridData && gridData.width > 0 && gridData.height > 0)
    ? Math.max(4, Math.min(20, Math.floor(600 / Math.max(gridData.width, gridData.height)))) || 16
    : 16;

  const usedIds = getUsedMaterialIds();
  const colorCounts = getColorCounts();

  const deleteSelection = () => {
    if (!gridData) return;
    const newGrid = gridData.grid.map((row) => [...row]);
    const newMergedBlocks = [...mergedBlocks];
    const newHealthMap = new Map(healthMap);

    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      if (y < newGrid.length && x < newGrid[0].length) {
        newGrid[y][x] = -1;
        const displayY = toDisplayY(y);
        newHealthMap.delete(`${x},${displayY}`);
        
        // Remove merged blocks that contain this cell
        const blockIdx = newMergedBlocks.findIndex(b => 
          x >= b.x && x < b.x + b.w && 
          displayY >= b.y && displayY < b.y + b.h
        );
        if (blockIdx !== -1) newMergedBlocks.splice(blockIdx, 1);
      }
    });

    setGridData({ ...gridData, grid: newGrid });
    setMergedBlocks(newMergedBlocks);
    setHealthMap(newHealthMap);
    // Selection persists
  };

  const deleteBlockByIndex = (idx: number) => {
    if (!gridData) return;
    commitChange();
    const newMergedBlocks = [...mergedBlocks];
    
    const b = newMergedBlocks[idx];
    if (b) {
      newMergedBlocks.splice(idx, 1);
      setMergedBlocks(newMergedBlocks);
      toast.success(`Đã xóa Block ${idx} (giữ lại pixel)`);
    }
  };

  const deleteBlock = () => {
    if (!gridData) return;
    commitChange();
    let newMergedBlocks = [...mergedBlocks];

    const blocksToDelete = new Set<number>();
    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      const displayY = toDisplayY(y);
      const bIdx = newMergedBlocks.findIndex(b => 
        x >= b.x && x < b.x + b.w && displayY >= b.y && displayY < b.y + b.h
      );
      if (bIdx !== -1) blocksToDelete.add(bIdx);
    });

    const finalBlocks = newMergedBlocks.filter((_, i) => !blocksToDelete.has(i));
    setMergedBlocks(finalBlocks);
    toast.success("Đã xóa các Block được chọn (giữ lại pixel)");
  };

  const addGateFromSelection = () => {
    if (selectedCells.size === 0 || !gridData) {
      toast.error("Vui lòng chọn vùng cho Gate");
      return;
    }

    const selectedPoints: GridPointData[] = (Array.from(selectedCells) as string[]).map(s => {
      const [x, y] = s.split(",").map(Number);
      return { X: x, Y: toDisplayY(y) };
    });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedPoints.forEach(p => {
      minX = Math.min(minX, p.X);
      minY = Math.min(minY, p.Y);
      maxX = Math.max(maxX, p.X);
      maxY = Math.max(maxY, p.Y);
    });

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    // Validate selection is a solid rectangle
    if (selectedCells.size !== w * h) {
      toast.error("Vui lòng chọn vùng hình chữ nhật đặc");
      return;
    }

    let headSize = 0;
    let barrierLength = 0;
    let direction = FacingDirection.Right;
    let headPoints: GridPointData[] = [];

    if (w >= h) {
      // Horizontal gate (or square)
      if (h !== 2 && h !== 3) {
        toast.error("Head của Gate phải có kích thước 2x2 hoặc 3x3 (chiều cao hiện tại: " + h + ")");
        return;
      }
      headSize = h;
      barrierLength = w - headSize;
      direction = FacingDirection.Right; // Default head on left
      
      // Extract head points (leftmost square)
      headPoints = selectedPoints.filter(p => p.X < minX + headSize);
    } else {
      // Vertical gate
      if (w !== 2 && w !== 3) {
        toast.error("Head của Gate phải có kích thước 2x2 hoặc 3x3 (chiều rộng hiện tại: " + w + ")");
        return;
      }
      headSize = w;
      barrierLength = h - headSize;
      direction = FacingDirection.Down; // Default head on top
      
      // Extract head points (topmost square)
      // In display coords, top is higher Y
      headPoints = selectedPoints.filter(p => p.Y > maxY - headSize);
    }

    commitChange();
    const material = levelIdxArray.length > 0 ? levelIdxArray[0] : 0;
    const count = newGateCount;

    // Recalculate all points to ensure order (Head first)
    const allPoints = calculateGatePixels(headPoints, direction, barrierLength);

    // Update grid
    const newGrid = gridData.grid.map(row => [...row]);
    allPoints.forEach(p => {
      const iy = gridData.height - 1 - p.Y;
      if (iy >= 0 && iy < newGrid.length && p.X >= 0 && p.X < newGrid[0].length) {
        newGrid[iy][p.X] = material;
      }
    });

    setGridData({ ...gridData, grid: newGrid });
    setGates(prev => [...prev, {
      points: allPoints,
      headPoints,
      direction,
      length: barrierLength,
      material,
      count
    }]);
    
    setSelectedCells(new Set());
    toast.success(`Đã thêm Gate! (Head: ${headSize}x${headSize}, Barrier: ${barrierLength})`);
  };

  const calculateGatePixels = (headPoints: GridPointData[], direction: number, length: number) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    headPoints.forEach(p => {
      minX = Math.min(minX, p.X);
      minY = Math.min(minY, p.Y);
      maxX = Math.max(maxX, p.X);
      maxY = Math.max(maxY, p.Y);
    });

    // Gate points MUST start with Head points
    const allPoints: GridPointData[] = [...headPoints];
    
    if (direction === FacingDirection.Right) {
      // Barrier extends to the right, Head is on the left
      for (let x = maxX + 1; x <= maxX + length; x++) {
        for (let y = minY; y <= maxY; y++) allPoints.push({ X: x, Y: y });
      }
    } else if (direction === FacingDirection.Left) {
      // Barrier extends to the left, Head is on the right
      for (let x = minX - 1; x >= minX - length; x--) {
        for (let y = minY; y <= maxY; y++) allPoints.push({ X: x, Y: y });
      }
    } else if (direction === FacingDirection.Up) {
      // Barrier extends up, Head is at the bottom
      for (let y = maxY + 1; y <= maxY + length; y++) {
        for (let x = minX; x <= maxX; x++) allPoints.push({ X: x, Y: y });
      }
    } else if (direction === FacingDirection.Down) {
      // Barrier extends down, Head is at the top
      for (let y = minY - 1; y >= minY - length; y--) {
        for (let x = minX; x <= maxX; x++) allPoints.push({ X: x, Y: y });
      }
    }
    return allPoints;
  };

  const updateGate = (idx: number, updates: Partial<{ direction: number, length: number, material: number, count: number }>) => {
    if (!gridData) return;
    commitChange();
    const newGates = [...gates];
    const gate = { ...newGates[idx], ...updates };
    
    // 1. Clear old gate pixels from grid
    const newGrid = gridData.grid.map(row => [...row]);
    newGates[idx].points.forEach(p => {
      const iy = gridData.height - 1 - p.Y;
      if (iy >= 0 && iy < newGrid.length && p.X >= 0 && p.X < newGrid[0].length) {
        newGrid[iy][p.X] = -1;
      }
    });
    
    // 2. Recalculate points
    gate.points = calculateGatePixels(gate.headPoints, gate.direction, gate.length);
    
    // 3. Fill new gate pixels
    gate.points.forEach(p => {
      const iy = gridData.height - 1 - p.Y;
      if (iy >= 0 && iy < newGrid.length && p.X >= 0 && p.X < newGrid[0].length) {
        newGrid[iy][p.X] = gate.material;
      }
    });
    
    newGates[idx] = gate;
    setGridData({ ...gridData, grid: newGrid });
    setGates(newGates);
  };

  const deleteGate = (idx: number) => {
    if (!gridData) return;
    commitChange();
    const newGrid = gridData.grid.map(row => [...row]);
    gates[idx].points.forEach(p => {
      const iy = gridData.height - 1 - p.Y;
      if (iy >= 0 && iy < newGrid.length && p.X >= 0 && p.X < newGrid[0].length) {
        newGrid[iy][p.X] = -1;
      }
    });
    setGridData({ ...gridData, grid: newGrid });
    setGates(prev => prev.filter((_, i) => i !== idx));
    toast.success("Đã xóa Gate!");
  };

  const updateBlockHealth = (idx: number, health: number) => {
    commitChange();
    setMergedBlocks(prev => prev.map((b, i) => i === idx ? { ...b, health } : b));
  };

  const deletePointBlock = () => {
    if (!gridData) return;
    commitChange();
    const newGrid = gridData.grid.map((row) => [...row]);
    let newMergedBlocks = [...mergedBlocks];
    const newHealthMap = new Map(healthMap);

    // Track which blocks are affected
    const affectedBlockIndices = new Set<number>();

    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      const displayY = toDisplayY(y);
      
      // Set pixel to -1 in grid
      newGrid[y][x] = -1;
      newHealthMap.delete(`${x},${displayY}`);

      // Find which block this pixel belongs to
      const bIdx = newMergedBlocks.findIndex(b => 
        x >= b.x && x < b.x + b.w && displayY >= b.y && displayY < b.y + b.h
      );
      if (bIdx !== -1) {
        affectedBlockIndices.add(bIdx);
      }
    });

    // Process affected blocks to resize them
    const blocksToRemove: number[] = [];
    affectedBlockIndices.forEach(idx => {
      const b = newMergedBlocks[idx];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let hasPixels = false;

      // Find the new bounding box of remaining pixels in this block's area
      for (let dy = 0; dy < b.h; dy++) {
        for (let dx = 0; dx < b.w; dx++) {
          const px = b.x + dx;
          const py = b.y + dy;
          const iy = gridData.height - 1 - py;
          
          // Check if this pixel is still part of the block (not -1 in the NEW grid)
          if (newGrid[iy][px] !== -1) {
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
            hasPixels = true;
          }
        }
      }

      if (!hasPixels) {
        blocksToRemove.push(idx);
      } else {
        // Update block dimensions
        const oldX = b.x, oldY = b.y, oldW = b.w, oldH = b.h;
        b.x = minX;
        b.y = minY;
        b.w = maxX - minX + 1;
        b.h = maxY - minY + 1;

        // Clear pixels that are in the old block area but NOT in the new one
        for (let dy = 0; dy < oldH; dy++) {
          for (let dx = 0; dx < oldW; dx++) {
            const px = oldX + dx;
            const py = oldY + dy;
            if (px < b.x || px >= b.x + b.w || py < b.y || py >= b.y + b.h) {
              const iy = gridData.height - 1 - py;
              newGrid[iy][px] = -1;
            }
          }
        }
      }
    });

    // Remove blocks that have no pixels left
    const finalBlocks = newMergedBlocks.filter((_, i) => !blocksToRemove.includes(i));

    setGridData({ ...gridData, grid: newGrid });
    setMergedBlocks(finalBlocks);
    setHealthMap(newHealthMap);
    // Selection persists
  };

  const mergeSelection = () => {
    if (!gridData || selectedCells.size === 0) return;
    commitChange();
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      const displayY = toDisplayY(y);
      minX = Math.min(minX, x);
      minY = Math.min(minY, displayY);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, displayY);
    });

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    
    // Get material from the first selected cell
    const firstKey = Array.from(selectedCells)[0] as string;
    if (!firstKey) return;
    const [fx, fy] = firstKey.split(",").map(Number);
    const material = gridData.grid[fy][fx];

    const newBlock = {
      x: minX,
      y: minY,
      w,
      h,
      material: material >= 0 ? material : 0,
      health: healthValue
    };

    // Remove any existing merged blocks that overlap
    const filteredBlocks = mergedBlocks.filter(b => {
      const overlapX = Math.max(minX, b.x) < Math.min(maxX + 1, b.x + b.w);
      const overlapY = Math.max(minY, b.y) < Math.min(maxY + 1, b.y + b.h);
      return !(overlapX && overlapY);
    });

    setMergedBlocks([...filteredBlocks, newBlock]);
    
    // Update grid colors for the merged area
    const newGrid = gridData.grid.map(row => [...row]);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const internalY = gridData.height - 1 - (minY + dy);
        newGrid[internalY][minX + dx] = newBlock.material;
      }
    }
    setGridData({ ...gridData, grid: newGrid });
    // Selection persists
  };

  const mergeKey = () => {
    if (!gridData || selectedCells.size === 0) return;
    commitChange();
    const points: GridPointData[] = [];
    const newGrid = gridData.grid.map(row => [...row]);
    
    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      points.push({ X: x, Y: toDisplayY(y) });
      newGrid[y][x] = -1; // Clear pixel
    });
    
    setGridData({ ...gridData, grid: newGrid });
    setKeys([...keys, { points }]);
    setSelectedCells(new Set());
  };

  const mergePipe = () => {
    if (!gridData || selectedCells.size === 0) return;
    commitChange();
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      const displayY = toDisplayY(y);
      minX = Math.min(minX, x);
      minY = Math.min(minY, displayY);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, displayY);
    });
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    
    if (!((w === 3 && h === 3) || (w === 4 && h === 4))) {
      toast.error("Pixel Pipe chỉ cho phép kích thước 3x3 hoặc 4x4.");
      return;
    }

    const points: GridPointData[] = [];
    const newGrid = gridData.grid.map(row => [...row]);
    
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        points.push({ X: px, Y: py });
        const internalY = gridData.height - 1 - py;
        if (internalY >= 0 && internalY < newGrid.length) {
          newGrid[internalY][px] = -1; // Initially transparent
        }
      }
    }

    setGridData({ ...gridData, grid: newGrid });
    setPixelPipes([...pixelPipes, { points, queue: [] }]);
  };

  const deleteKey = (idx: number) => {
    commitChange();
    setKeys(keys.filter((_, i) => i !== idx));
  };

  const deletePipe = (idx: number) => {
    commitChange();
    setPixelPipes(pixelPipes.filter((_, i) => i !== idx));
  };

  const updatePipeGroupMaterial = (pipeIdx: number, groupIdx: number, material: number) => {
    const pipe = pixelPipes[pipeIdx];
    if (!pipe) return;

    commitChange();
    // Check adjacency
    if (groupIdx > 0 && pipe.queue[groupIdx - 1].Material === material) return;
    if (groupIdx < pipe.queue.length - 1 && pipe.queue[groupIdx + 1].Material === material) return;

    const newPipes = [...pixelPipes];
    newPipes[pipeIdx].queue[groupIdx].Material = material;
    
    // If first material changed, update grid
    if (groupIdx === 0 && gridData) {
      const newGrid = gridData.grid.map(row => [...row]);
      pipe.points.forEach(p => {
        const iy = gridData.height - 1 - p.Y;
        if (iy >= 0 && iy < newGrid.length) newGrid[iy][p.X] = material;
      });
      setGridData({ ...gridData, grid: newGrid });
    }
    
    setPixelPipes(newPipes);
    setEditingPipeGroup(null);
  };

  const updatePipeGroupCount = (pipeIdx: number, groupIdx: number, count: number) => {
    commitChange();
    const newPipes = [...pixelPipes];
    newPipes[pipeIdx].queue[groupIdx].Count = count;
    setPixelPipes(newPipes);
  };

  const addPipeGroupToExisting = (pipeIdx: number) => {
    commitChange();
    const newPipes = [...pixelPipes];
    const pipe = newPipes[pipeIdx];
    const lastMaterial = pipe.queue.length > 0 ? pipe.queue[pipe.queue.length - 1].Material : -1;
    
    let nextMaterial = levelIdxArray.length > 0 ? levelIdxArray[0] : 0;
    
    // Adjacency check: if the first color is same as last, pick the second color if available
    if (nextMaterial === lastMaterial && levelIdxArray.length > 1) {
      nextMaterial = levelIdxArray[1];
    }
    
    pipe.queue.push({ Material: nextMaterial, Count: 10 });
    
    // If this is the first group, update grid
    if (pipe.queue.length === 1 && gridData) {
      const newGrid = gridData.grid.map(row => [...row]);
      pipe.points.forEach(p => {
        const iy = gridData.height - 1 - p.Y;
        if (iy >= 0 && iy < newGrid.length) newGrid[iy][p.X] = nextMaterial;
      });
      setGridData({ ...gridData, grid: newGrid });
    }
    
    setPixelPipes(newPipes);
  };

  const removePipeGroupFromExisting = (pipeIdx: number, groupIdx: number) => {
    commitChange();
    const newPipes = [...pixelPipes];
    newPipes[pipeIdx].queue.splice(groupIdx, 1);
    
    // If we removed the first one, update grid with the new first one
    if (groupIdx === 0 && gridData) {
      const newGrid = gridData.grid.map(row => [...row]);
      const material = newPipes[pipeIdx].queue.length > 0 ? newPipes[pipeIdx].queue[0].Material : -1;
      newPipes[pipeIdx].points.forEach(p => {
        const iy = gridData.height - 1 - p.Y;
        if (iy >= 0 && iy < newGrid.length) newGrid[iy][p.X] = material;
      });
      setGridData({ ...gridData, grid: newGrid });
    }
    
    setPixelPipes(newPipes);
  };

  const setHealthForSelection = () => {
    commitChange();
    const newHealthMap = new Map(healthMap);
    const newMergedBlocks = [...mergedBlocks];

    selectedCells.forEach((key: string) => {
      const [x, y] = key.split(",").map(Number);
      const displayY = toDisplayY(y);
      
      // Update health for individual pixel
      newHealthMap.set(`${x},${displayY}`, healthValue);
      
      // Update health for ANY block that contains this pixel
      newMergedBlocks.forEach(b => {
        if (x >= b.x && x < b.x + b.w && displayY >= b.y && displayY < b.y + b.h) {
          b.health = healthValue;
        }
      });
    });

    setHealthMap(newHealthMap);
    setMergedBlocks(newMergedBlocks);
  };

  const getCellHealth = (x: number, y: number) => {
    const displayY = toDisplayY(y);
    // Check merged blocks first
    const block = mergedBlocks.find(b => 
      x >= b.x && x < b.x + b.w && 
      displayY >= b.y && displayY < b.y + b.h
    );
    if (block) return block.health;
    return healthMap.get(`${x},${displayY}`);
  };

  const isBlockOrigin = (x: number, y: number) => {
    const displayY = toDisplayY(y);
    return mergedBlocks.some(b => b.x === x && b.y === displayY);
  };

  const getBlockAt = (x: number, y: number) => {
    const displayY = toDisplayY(y);
    return mergedBlocks.find(b => 
      x >= b.x && x < b.x + b.w && 
      displayY >= b.y && displayY < b.y + b.h
    );
  };

  return (
    <>
      <CanvasSizeDialog 
        open={showCanvasSizeDialog}
        onOpenChange={setShowCanvasSizeDialog}
        pendingW={pendingCanvasW}
        setPendingW={setPendingCanvasW}
        pendingH={pendingCanvasH}
        setPendingH={setPendingCanvasH}
        anchor={canvasAnchor}
        setAnchor={setCanvasAnchor}
        onConfirm={() => {
          const nw = parseInt(pendingCanvasW as any) || gridData?.width || 64;
          const nh = parseInt(pendingCanvasH as any) || gridData?.height || 64;
          resizeGrid(nw, nh, canvasAnchor);
          setShowCanvasSizeDialog(false);
        }}
        currentW={gridData?.width || 64}
        currentH={gridData?.height || 64}
      />
      <div className="min-h-screen bg-background p-4 md:p-6 text-foreground">
      <div className="w-full mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Grid3X3 className="w-9 h-9 text-primary" />
            <h1 className="text-3xl font-black tracking-tight">Pixel Grid Converter</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Upload ảnh → chọn màu từ master palette → convert sang pixel grid
          </p>
        </div>

        {/* Master Palette */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-bold text-lg tracking-tight flex items-center gap-2">
                Master Palette ({masterPalette.length} màu) 
                <span className="text-muted-foreground font-normal text-sm">— ID: 0→{masterPalette.length - 1}</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 rounded-lg font-semibold" onClick={selectAllUsedColors}>
                <Check className="w-3.5 h-3.5" /> Select All Used
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 rounded-lg text-destructive hover:text-destructive border-border hover:bg-destructive/5 font-semibold" onClick={clearLevelColors}>
                <X className="w-3.5 h-3.5" /> Clear All
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 rounded-lg font-semibold" onClick={() => setShowResetPaletteDialog(true)}>
                <ArrowRightLeft className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 rounded-lg font-semibold" onClick={savePalette}>
                <Save className="w-3.5 h-3.5" /> Lưu
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 rounded-lg font-semibold" onClick={() => setShowSaveDialog(true)}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
              <input ref={paletteFileRef} type="file" accept=".json" onChange={loadPaletteFile} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <input ref={levelFileInputRef} type="file" accept=".json" onChange={handleLevelFileUpload} className="hidden" />
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 rounded-lg font-semibold" onClick={() => paletteFileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Load
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20 gap-2">
            {masterPalette.map((color, idx) => {
              const isLevelPicked = levelIndices.has(idx);
              const isSelected = selectedPaletteId === idx;
              const count = colorCounts.get(idx) || 0;
              return (
                <div key={idx} className="relative group aspect-square">
                  <button
                    className={`w-full h-full rounded-md border transition-all flex flex-col items-center justify-center overflow-hidden shadow-sm hover:z-30 hover:scale-105 active:scale-95 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 z-20' : ''
                    }`}
                    style={{
                      backgroundColor: color,
                      borderColor: isSelected ? "hsl(var(--primary))" : isLevelPicked ? "hsla(var(--primary), 0.5)" : "hsl(var(--border))",
                    }}
                    onClick={() => {
                      toggleLevelColor(idx);
                      setSelectedPaletteId(idx);
                    }}
                    title={`ID:${idx} ${color} — Count: ${count}`}
                  >
                    <span 
                      className="text-[10px] font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-white"
                    >
                      {count > 0 ? count : ""}
                    </span>
                    
                    <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] text-white/70 pointer-events-none font-bold bg-black/20">
                      {idx}
                    </span>
                  </button>
                  {isLevelPicked && (
                    <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-primary rounded-full flex items-center justify-center z-20 shadow-md border-2 border-card">
                      <Check className="w-3 h-3 text-primary-foreground stroke-[3px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 font-medium pt-2">
            Click chọn màu cho level ({levelIndices.size} màu đã chọn) · Số hiển thị là tổng lượng pixel/health/count
          </p>
        </div>

        {/* Controls & Project Settings */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-6 shadow-sm">
          {/* Row 1: Settings and Main Actions */}
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-10 flex-1">
              <div className="flex items-center gap-3 min-w-max">
                <FolderOpen className="w-5 h-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">PROJECT SETTINGS</span>
              </div>
              
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Pipes:</span>
                <Input
                  value={manualPath}
                  onChange={(e) => {
                    setManualPath(e.target.value);
                    localStorage.setItem("pixel-grid-manual-path", e.target.value);
                  }}
                  placeholder="manual path..."
                  className="h-11 text-sm flex-1 bg-muted/30 border-border rounded-lg focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-4 border-l border-border pl-10">
                <span className="text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap">Image ID</span>
                <div className="flex items-center">
                  <Input
                    type="number"
                    value={levelData?.ImageId ?? levelIndex}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLevelIndex(val);
                      setLevelData(prev => prev ? { ...prev, ImageId: val } : {
                        Difficulty: "Easy",
                        HasTimeLimit: false,
                        TimeLimit: 0,
                        SlotCount: 5,
                        ConveyorLimit: 5,
                        QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                        SurpriseShooters: { Shooters: [] },
                        ConnectedShooters: { Connections: [] },
                        Locks: { Shooters: [] },
                        ImageId: val,
                        levelId: 0
                      });
                    }}
                    className="h-11 text-sm w-28 font-bold text-center rounded-lg bg-muted/30 border-border focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 min-w-max items-center">
              <Button variant="outline" size="sm" className="h-11 gap-2 text-sm font-bold px-6 rounded-lg" onClick={loadLevelData}>
                <Upload className="w-4.5 h-4.5 text-muted-foreground" /> Load
              </Button>
              <Button size="sm" className="h-11 gap-2 text-sm font-bold px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md" onClick={saveLevelData}>
                <Save className="w-4.5 h-4.5" /> Save JSON
              </Button>
              <Button size="sm" className="h-11 gap-2 text-sm font-bold px-8 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg shadow-md" onClick={saveAllData}>
                <Layers className="w-4.5 h-4.5" /> Save All
              </Button>
              <Button variant="outline" size="sm" className="h-11 gap-2 text-sm font-bold px-6 rounded-lg" onClick={copyLevelJson} title="Copy JSON">
                <Check className="w-4.5 h-4.5 text-green-500" /> Copy JSON
              </Button>
            </div>
          </div>

          {/* Row 2: Image Tools and Info */}
          <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border">
            <div className="flex items-center gap-4">
              <Button onClick={() => fileInputRef.current?.click()} className="h-11 gap-2 px-8 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg" size="sm">
                <Upload className="w-5 h-5" /> Upload ảnh
              </Button>
              <Button onClick={() => setShowNewLevelDialog(true)} variant="outline" className="h-11 gap-2 px-8 font-bold rounded-lg bg-muted/30 hover:bg-muted/50" size="sm">
                <Plus className="w-5 h-5" /> New Level
              </Button>

              <div className="h-10 w-px bg-border mx-4" />

              <label className="flex items-center gap-3 text-sm font-bold cursor-pointer select-none px-4 py-2.5 rounded-lg hover:bg-muted transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoTrim} 
                  onChange={(e) => setAutoTrim(e.target.checked)} 
                  className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20 cursor-pointer" 
                />
                <div className="flex items-center gap-2">
                  <Scissors className="w-4.5 h-4.5 text-muted-foreground" />
                  Auto Trim
                </div>
              </label>
            </div>

            <div className="flex items-center gap-12">
              <div className="flex items-center gap-5">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Grid Size:</span>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[gridSize]}
                    min={8}
                    max={256}
                    step={1}
                    onValueChange={([val]) => {
                      setGridSize(val);
                      if (originalSize) {
                        const newW = val;
                        const newH = Math.round(val / imageAspect);
                        resizeGrid(newW, newH);
                      } else {
                        resizeGrid(val, val);
                      }
                    }}
                    className="w-48"
                  />
                  <div className="bg-muted border-none px-5 py-2 rounded-lg min-w-[4rem] text-center shadow-inner">
                    <span className="text-sm font-black font-mono">
                      {gridData ? gridSize : gridSize}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-11 px-6 text-xs font-bold rounded-lg bg-muted/30 hover:bg-muted/50"
                  onClick={() => {
                    if (originalSize && imageSrc) {
                      const newSize = Math.max(originalSize.width, originalSize.height);
                      if (newSize === gridSize) {
                        processImage(imageSrc, levelIdxArray, masterPalette);
                      } else {
                        setGridSize(newSize);
                      }
                    }
                  }}
                >
                  Size gốc
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-11 gap-2 px-6 text-xs font-bold rounded-lg bg-muted/30 hover:bg-muted/50"
                  onClick={() => setShowCanvasSizeDialog(true)}
                >
                  <Maximize2 className="w-4.5 h-4.5" /> Canvas Size
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-100 pl-8 ml-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Physical Size:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={physicalWidth}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPhysicalWidth(val);
                    localStorage.setItem("pixel-grid-physical-width", val.toString());
                  }}
                  className="h-10 w-16 text-xs font-bold text-center rounded-lg bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500/20"
                />
                <span className="text-[10px] text-slate-400 font-bold">×</span>
                <Input
                  type="number"
                  step="0.1"
                  value={physicalHeight}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPhysicalHeight(val);
                    localStorage.setItem("pixel-grid-physical-height", val.toString());
                  }}
                  className="h-10 w-16 text-xs font-bold text-center rounded-lg bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500/20"
                />
                <div className="flex flex-col gap-0.5 pr-1">
                  <div className="flex flex-col h-full justify-center">
                    <ChevronUp className="w-2.5 h-2.5 text-slate-300" />
                    <ChevronDown className="w-2.5 h-2.5 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr_380px] gap-6 items-start">
          {/* Left Sidebar: Level Data */}
          <div className="bg-card rounded-xl border p-4 flex flex-col gap-4 overflow-y-auto max-h-[800px]">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Level Data
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 pb-3 border-b">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs gap-1"
                    onClick={() => levelFileInputRef.current?.click()}
                  >
                    <FolderOpen className="w-3 h-3" /> Load
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs gap-1"
                    onClick={() => setLevelData({
                      Difficulty: "Easy",
                      HasTimeLimit: false,
                      TimeLimit: 0,
                      SlotCount: 5,
                      ConveyorLimit: 5,
                      QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                      SurpriseShooters: { Shooters: [] },
                      ConnectedShooters: { Connections: [] },
                      Locks: { Shooters: [] },
                      ImageId: levelIndex,
                      levelId: 0
                    })}
                  >
                    <Plus className="w-3 h-3" /> New
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 text-xs gap-1 font-bold"
                    onClick={async () => {
                      if (!levelData) return;

                      // Level Data Validation
                      if (lockCountInQueues !== keyCountInData) {
                        toast.error(`Không thể lưu! Số lượng Lock (${lockCountInQueues}) và Key (${keyCountInData}) phải bằng nhau.`);
                        return;
                      }

                      for (let i = 0; i < levelData.QueueGroup.shooterQueues.length; i++) {
                        const queue = levelData.QueueGroup.shooterQueues[i];
                        if (queue.shooters.length > 0) {
                          const firstShooter = queue.shooters[0];
                          if (levelData.SurpriseShooters.Shooters.includes(firstShooter.id)) {
                            toast.error(`Không thể lưu! Shooter đầu tiên ở Cột ${i + 1} không được là dấu hỏi.`);
                            return;
                          }
                        }
                      }

                      const { id, ImageId, Difficulty, ...rest } = levelData;
                      const filteredQueues = levelData.QueueGroup.shooterQueues.filter(q => q.shooters.length > 0);
                      const orderedData = { 
                        id, 
                        ImageId, 
                        Difficulty, 
                        ...rest, 
                        QueueGroup: { shooterQueues: filteredQueues } 
                      };
                      const json = JSON.stringify(orderedData, null, 2);
                      const fileName = `Level_${levelData.id ?? 0}.json`;

                      if ('showSaveFilePicker' in window) {
                        try {
                          const handle = await (window as any).showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{
                              description: 'JSON File',
                              accept: { 'application/json': ['.json'] },
                            }],
                          });
                          const writable = await handle.createWritable();
                          await writable.write(json);
                          await writable.close();
                          toast.success(`Đã lưu file: ${handle.name}`);
                          return;
                        } catch (err: any) {
                          if (err.name === 'AbortError') return;
                        }
                      }
                      
                      const blob = new Blob([json], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = fileName;
                      link.click();
                      URL.revokeObjectURL(url);
                      toast.success(`Đã tải xuống file: ${fileName}`);
                    }}
                    disabled={!levelData || Object.values(calculateRemainingColors()).some((count: any) => count > 0)}
                  >
                    <Save className="w-3 h-3" /> Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Level ID</span>
                  <Input 
                    type="number" 
                    className="h-8 text-xs w-full" 
                    value={levelData?.id ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLevelData(prev => prev ? { ...prev, id: val } : {
                        Difficulty: "Easy",
                        HasTimeLimit: false,
                        TimeLimit: 0,
                        SlotCount: 5,
                        ConveyorLimit: 5,
                        QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                        SurpriseShooters: { Shooters: [] },
                        ConnectedShooters: { Connections: [] },
                        Locks: { Shooters: [] },
                        ImageId: levelIndex,
                        id: val
                      });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Image ID</span>
                  <Input 
                    type="number" 
                    className="h-8 text-xs w-full" 
                    value={levelData?.ImageId ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLevelData(prev => prev ? { ...prev, ImageId: val } : {
                        Difficulty: "Easy",
                        HasTimeLimit: false,
                        TimeLimit: 0,
                        SlotCount: 5,
                        ConveyorLimit: 5,
                        QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                        SurpriseShooters: { Shooters: [] },
                        ConnectedShooters: { Connections: [] },
                        Locks: { Shooters: [] },
                        ImageId: val,
                        id: 0
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Difficulty</span>
                  <select 
                    className="h-8 text-xs w-full border rounded px-2 bg-background"
                    value={levelData?.Difficulty || "Easy"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLevelData(prev => prev ? {...prev, Difficulty: val} : {
                        Difficulty: val,
                        HasTimeLimit: false,
                        TimeLimit: 0,
                        SlotCount: 5,
                        ConveyorLimit: 5,
                        QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                        SurpriseShooters: { Shooters: [] },
                        ConnectedShooters: { Connections: [] },
                        Locks: { Shooters: [] },
                        ImageId: levelIndex,
                        id: 0
                      });
                    }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Hard">Hard</option>
                    <option value="Super Hard">Super Hard</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Slot Count</span>
                  <Input 
                    type="number" 
                    className="h-8 text-xs w-full" 
                    value={levelData?.SlotCount || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLevelData(prev => prev ? { ...prev, SlotCount: val } : {
                        Difficulty: "Easy",
                        HasTimeLimit: false,
                        TimeLimit: 0,
                        SlotCount: val,
                        ConveyorLimit: 5,
                        QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                        SurpriseShooters: { Shooters: [] },
                        ConnectedShooters: { Connections: [] },
                        Locks: { Shooters: [] },
                        ImageId: levelIndex,
                        levelId: 0
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Conveyor Limit</span>
                  <Input 
                    type="number" 
                    className="h-8 text-xs w-full" 
                    value={levelData?.ConveyorLimit || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLevelData(prev => prev ? { ...prev, ConveyorLimit: val } : {
                        Difficulty: "Easy",
                        HasTimeLimit: false,
                        TimeLimit: 0,
                        SlotCount: 5,
                        ConveyorLimit: val,
                        QueueGroup: { shooterQueues: Array(5).fill(null).map(() => ({ shooters: [] })) },
                        SurpriseShooters: { Shooters: [] },
                        ConnectedShooters: { Connections: [] },
                        Locks: { Shooters: [] },
                        ImageId: levelIndex,
                        levelId: 0
                      });
                    }}
                  />
                </div>
              </div>

              {/* Shooter Queues */}
              <div className="space-y-2 pt-2 border-t">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Shooter Queues</span>
                <div className="relative bg-muted/30 rounded border flex flex-col h-[450px] overflow-hidden">
                  {/* Scrollable Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <div id="shooters-container" className="flex gap-1 p-1 min-h-full">
                      {Array.from({ length: 5 }).map((_, colIndex) => {
                        const queue = levelData?.QueueGroup.shooterQueues[colIndex];
                        return (
                          <div key={colIndex} className="flex-1 flex flex-col gap-1">
                            <div className="text-[9px] text-center font-bold bg-background/50 py-0.5 rounded sticky top-0 z-20">Col {colIndex + 1}</div>
                            <div className="flex-1 space-y-1">
                              {queue?.shooters.map((shooter, sIdx) => {
                                const isHidden = levelData?.SurpriseShooters.Shooters.includes(shooter.id);
                                return (
                                  <React.Fragment key={shooter.id}>
                                    {/* Insert Button Above First Item or Between Items */}
                                    {exchangingShooter && (
                                      <div 
                                        className="h-1 -my-0.5 relative z-30 group/insert flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleInsertExchange(colIndex, sIdx);
                                        }}
                                      >
                                        <div className="w-full h-0.5 bg-primary/20 group-hover/insert:bg-primary transition-colors" />
                                        <div className="absolute w-4 h-4 rounded-full bg-primary text-white items-center justify-center hidden group-hover/insert:flex shadow-md scale-75">
                                          <Plus className="w-3 h-3" />
                                        </div>
                                      </div>
                                    )}

                                    <div 
                                      className={`group relative w-[70%] mx-auto aspect-square rounded border flex items-center justify-center text-[15px] font-bold shadow-sm cursor-pointer hover:ring-2 ring-primary transition-all ${
                                        exchangingShooter?.col === colIndex && exchangingShooter?.idx === sIdx ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                                      }`}
                                      style={{ 
                                        backgroundColor: shooter.material === -1 ? '#facc15' : masterPalette[shooter.material],
                                        color: shooter.material === -1 ? '#000' : '#fff',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                      }}
                                      onDoubleClick={() => {
                                        setEditingShooter({ col: colIndex, idx: sIdx, data: shooter });
                                      }}
                                    >
                                      {shooter.material === -1 ? <Lock className="w-5 h-5" /> : shooter.ammo}
                                      
                                      {isHidden ? (
                                        <span 
                                          className="absolute bottom-0 right-0.5 text-[14px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] cursor-pointer hover:scale-110 transition-transform z-20"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLevelData(prev => {
                                              if (!prev) return null;
                                              return {
                                                ...prev,
                                                SurpriseShooters: {
                                                  Shooters: prev.SurpriseShooters.Shooters.filter(id => id !== shooter.id)
                                                }
                                              };
                                            });
                                          }}
                                        >
                                          ?
                                        </span>
                                      ) : (
                                        <div 
                                          className="absolute bottom-0.5 right-0.5 w-3 h-3 border border-white/50 rounded-sm hover:border-white transition-colors cursor-pointer z-20"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLevelData(prev => {
                                              if (!prev) return null;
                                              return {
                                                ...prev,
                                                SurpriseShooters: {
                                                  Shooters: [...prev.SurpriseShooters.Shooters, shooter.id]
                                                }
                                              };
                                            });
                                          }}
                                        />
                                      )}

                                      {/* Action Buttons */}
                                      <button 
                                        className="absolute -top-1 -left-1 bg-primary text-white rounded-full p-0.5 shadow-sm hover:bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        title="Exchange Position"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExchange(colIndex, sIdx);
                                        }}
                                      >
                                        <ArrowRightLeft className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 shadow-sm hover:bg-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        title="Delete"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteShooter(colIndex, sIdx);
                                        }}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>

                                      {/* Connection Nodes */}
                                      <div 
                                        id={`node-${shooter.id}-left`}
                                        className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 border-2 rounded-full z-10 hover:scale-125 transition-transform ${
                                          levelData?.ConnectedShooters.Connections.some(c => {
                                            const isNode0 = c.Shooters[0] === shooter.id && c.Nodes?.[0] === 'left';
                                            const isNode1 = c.Shooters[1] === shooter.id && c.Nodes?.[1] === 'left';
                                            return isNode0 || isNode1;
                                          })
                                            ? 'bg-primary border-primary'
                                            : 'bg-white border-primary'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleNodeClick(colIndex, sIdx, 'left');
                                        }}
                                      />
                                      <div 
                                        id={`node-${shooter.id}-right`}
                                        className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 border-2 rounded-full z-10 hover:scale-125 transition-transform ${
                                          levelData?.ConnectedShooters.Connections.some(c => {
                                            const isNode0 = c.Shooters[0] === shooter.id && c.Nodes?.[0] === 'right';
                                            const isNode1 = c.Shooters[1] === shooter.id && c.Nodes?.[1] === 'right';
                                            return isNode0 || isNode1;
                                          })
                                            ? 'bg-primary border-primary'
                                            : 'bg-white border-primary'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleNodeClick(colIndex, sIdx, 'right');
                                        }}
                                      />
                                    </div>

                                    {/* Insert Button Below Last Item */}
                                    {exchangingShooter && sIdx === (queue.shooters.length - 1) && (
                                      <div 
                                        className="h-1 -my-0.5 relative z-30 group/insert flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleInsertExchange(colIndex, sIdx + 1);
                                        }}
                                      >
                                        <div className="w-full h-0.5 bg-primary/20 group-hover/insert:bg-primary transition-colors" />
                                        <div className="absolute w-4 h-4 rounded-full bg-primary text-white items-center justify-center hidden group-hover/insert:flex shadow-md scale-75">
                                          <Plus className="w-3 h-3" />
                                        </div>
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Connection Lines Overlay */}
                    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 5 }}>
                      {levelData?.ConnectedShooters.Connections.map((conn) => {
                        // Find shooter positions
                        let s1: { col: number, idx: number } | null = null;
                        let s2: { col: number, idx: number } | null = null;

                        levelData.QueueGroup.shooterQueues.forEach((q, cIdx) => {
                          q.shooters.forEach((s, sIdx) => {
                            if (s.id === conn.Shooters[0]) s1 = { col: cIdx, idx: sIdx };
                            if (s.id === conn.Shooters[1]) s2 = { col: cIdx, idx: sIdx };
                          });
                        });

                        if (!s1 || !s2) return null;

                        // Calculate coordinates
                        // Sidebar width: 400px. Sidebar padding: 16px (p-4).
                        // Queue container width: 400 - 32 = 368px.
                        // Queue container padding: 4px (p-1). Gaps: 4px (gap-1).
                        // Available width for 5 cols: 368 - 8 (padding) - 16 (4 gaps) = 344px.
                        // colW = 344 / 5 = 68.8px
                        const colW = 68.8; 
                        const shooterSize = colW * 0.7; // 70% size
                        const gap = 4;
                        const padding = 4;
                        const labelH = 14; // Corrected label height

                        const getPos = (col: number, idx: number, shooterId: number, side: string) => {
                          const el = document.getElementById(`node-${shooterId}-${side}`);
                          const container = document.getElementById('shooters-container');
                          
                          if (el && container) {
                            const rect = el.getBoundingClientRect();
                            const contRect = container.getBoundingClientRect();
                            return {
                              x: rect.left - contRect.left + rect.width / 2,
                              y: rect.top - contRect.top + rect.height / 2
                            };
                          }

                          // Static Fallback
                          const colW = 68.4;
                          const gap = 4;
                          const padding = 4;
                          const labelH = 20;
                          const shooterSize = colW * 0.7;
                          const shooterHeight = shooterSize;
                          
                          const centerX = padding + col * (colW + gap) + colW / 2;
                          const x = side === 'left' ? centerX - shooterSize / 2 - 1 : centerX + shooterSize / 2 + 1;
                          const y = padding + labelH + idx * (shooterHeight + gap) + shooterHeight / 2;
                          return { x, y };
                        };

                        const p1 = getPos(s1.col, s1.idx, conn.Shooters[0], conn.Nodes[0]);
                        const p2 = getPos(s2.col, s2.idx, conn.Shooters[1], conn.Nodes[1]);

                        const midX = (p1.x + p2.x) / 2;
                        const midY = (p1.y + p2.y) / 2;

                        return (
                          <g key={conn.Id} className="pointer-events-auto group/line">
                            <line 
                              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                              stroke="hsl(var(--primary))" 
                              strokeWidth="4" 
                              strokeLinecap="round"
                              strokeDasharray="1 6"
                              className="drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
                            />
                            <line 
                              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                              stroke="hsl(var(--primary))" 
                              strokeWidth="2" 
                              strokeLinecap="round"
                              opacity="0.4"
                            />
                            <circle 
                              cx={midX} cy={midY} r="8" 
                              fill="hsl(var(--destructive))" 
                              className="opacity-0 group-hover/line:opacity-100 cursor-pointer transition-opacity"
                              onClick={() => deleteConnection(conn.Id)}
                            />
                            <path 
                              d={`M ${midX-3} ${midY-3} L ${midX+3} ${midY+3} M ${midX+3} ${midY-3} L ${midX-3} ${midY+3}`}
                              stroke="white"
                              strokeWidth="1.5"
                              className="opacity-0 group-hover/line:opacity-100 pointer-events-none"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Fixed Footer for Add Buttons */}
                  <div className="flex gap-1 p-1 border-t bg-muted/50">
                    {Array.from({ length: 5 }).map((_, colIndex) => (
                      <Button 
                        key={colIndex}
                        variant="secondary" 
                        className="h-6 flex-1 rounded text-[10px] font-bold uppercase bg-sky-500 hover:bg-sky-600 text-white"
                        onClick={() => setAddingToCol(colIndex)}
                      >
                        Add
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Remain in Level */}
              <div className="space-y-2 pt-2 border-t">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Color Remain in Level</span>
                <div className="bg-muted/30 rounded border p-2 h-24 overflow-y-auto">
                  <div className="grid grid-cols-10 gap-1">
                    {Object.entries(calculateRemainingColors())
                      .filter(([_, count]) => (count as number) > 0)
                      .map(([mat, count]) => (
                      <div 
                        key={mat} 
                        className="aspect-square rounded border flex flex-col items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ 
                          backgroundColor: masterPalette[parseInt(mat)],
                          textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000'
                        }}
                      >
                        <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-2">
                <span>Hidden: {levelData?.SurpriseShooters.Shooters.length || 0}</span>
                <span>Lock: {lockCountInQueues}/{keyCountInData}</span>
                <span>Connection: {getDisjointConnectionCount()}</span>
              </div>
            </div>
          </div>

          {/* Center: Grid */}
          <div className="bg-card rounded-xl border p-4 overflow-auto relative min-h-[600px]">
            {gridData ? (
              <div className="inline-block" ref={gridContainerRef}>
                <p className="text-xs text-muted-foreground mb-2">
                  💡 Kéo chuột: chọn vùng · Shift+click: rect · Ctrl+click: nhiều điểm · Gốc tọa độ: dưới-trái
                </p>
                <div className="relative inline-block leading-none">
                  {/* Y axis labels */}
                  <div className="absolute -left-6 top-[1px] flex flex-col" style={{ height: (gridData.height * cellSize) || 0 }}>
                    {Array.from({ length: gridData.height }, (_, row) => (
                      <div key={row} className="text-[7px] font-mono text-muted-foreground flex items-center justify-end pr-1" style={{ height: cellSize || 16 }}>
                        {toDisplayY(row)}
                      </div>
                    ))}
                  </div>

                    <div
                      className="inline-grid border border-border select-none align-top"
                      style={{ gridTemplateColumns: `repeat(${gridData.width}, ${cellSize}px)` }}
                    >
                      {gridData.grid.flatMap((row, y) =>
                        row.map((materialId, x) => {
                          const color = getMaterialColor(materialId);
                          const isTransparent = materialId < 0;
                          const inSel = isInSelection(x, y);
                          const health = getCellHealth(x, y);
                          const block = getBlockAt(x, y);
                          const isOrigin = block ? (block.x === x && block.y === toDisplayY(y)) : true;

                          return (
                            <div
                              key={`${x}-${y}`}
                              data-grid-cell
                              className="border-[0.5px] border-border/30 cursor-crosshair relative flex items-center justify-center overflow-hidden"
                              style={{
                                width: cellSize || 16,
                                height: cellSize || 16,
                                backgroundColor: isTransparent ? undefined : color,
                                backgroundImage: isTransparent
                                  ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)"
                                  : undefined,
                                backgroundSize: `${cellSize / 2}px ${cellSize / 2}px`,
                                backgroundPosition: `0 0, ${cellSize / 4}px ${cellSize / 4}px`,
                                outline: isBrushMode 
                                  ? (inSel ? "2px solid #2563eb" : hoveredCell?.x === x && hoveredCell?.y === y ? "1.5px solid #2563eb" : "none")
                                  : (inSel ? "2px solid hsl(var(--primary))" : hoveredCell?.x === x && hoveredCell?.y === y ? "1.5px solid hsl(var(--primary))" : "none"),
                                zIndex: inSel || (hoveredCell?.x === x && hoveredCell?.y === y) ? 10 : 1,
                                opacity: inSel ? 0.8 : 1,
                              }}
                              onMouseDown={(e) => handleCellMouseDown(x, y, e)}
                              onMouseEnter={(e) => handleCellMouseEnter(x, y, e)}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={`(${x}, ${toDisplayY(y)}) ID:${materialId}${health !== undefined ? ` Health:${health}` : ''}`}
                            >
                              {isOrigin && health !== undefined && !block && (
                                <span 
                                  className="text-[12px] font-bold pointer-events-none select-none"
                                  style={{ 
                                    color: 'white', 
                                    textShadow: '1px 1px 1px black, -1px -1px 1px black, 1px -1px 1px black, -1px 1px 1px black',
                                    zIndex: 5
                                  }}
                                >
                                  {health}
                                </span>
                              )}
                              {block && !isOrigin && (
                                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                              )}
                              {isBrushMode && brushColorId === -2 && inSel && (
                                <span className="absolute inset-0 flex items-center justify-center text-primary font-bold opacity-50 pointer-events-none select-none" style={{ fontSize: cellSize * 0.8 }}>?</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Block Outlines */}
                    {mergedBlocks
                      .filter(block => levelIndices.size === 0 || levelIndices.has(block.material))
                      .map((block, idx) => {
                        const bw = Math.min(3, Math.max(1, Math.min(block.w, block.h)));
                        const offsetTop = 1 + (bw - 1) * 0.25;
                        return (
                          <div
                            key={`block-outline-${idx}`}
                            className="absolute pointer-events-none border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] rounded-[1px] flex flex-col items-center justify-center"
                            style={{
                              borderWidth: bw,
                              left: (block.x * cellSize) || 0,
                              top: ((gridData.height - block.y - block.h) * cellSize + offsetTop) || 0,
                              width: (block.w * cellSize) || 0,
                              height: (block.h * cellSize) || 0,
                              zIndex: 15
                            }}
                          >
                            <div className="flex flex-col items-center justify-center bg-black/40 px-1 rounded max-w-[90%] overflow-hidden">
                              <span className="text-white font-bold leading-none truncate w-full text-center" style={{ fontSize: Math.min(block.w * cellSize * 0.8 / 7, block.h * cellSize * 0.4) }}>BLOCK {idx}</span>
                              <span className="text-white/80 font-mono leading-none truncate w-full text-center" style={{ fontSize: Math.min(block.w * cellSize * 0.8 / 4, block.h * cellSize * 0.4) }}>{block.health}</span>
                            </div>
                          </div>
                        );
                      })}

                    {/* Key Outlines */}
                    {keys.map((key, idx) => {
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      key.points.forEach(p => {
                        minX = Math.min(minX, p.X);
                        minY = Math.min(minY, p.Y);
                        maxX = Math.max(maxX, p.X);
                        maxY = Math.max(maxY, p.Y);
                      });
                      const w = maxX - minX + 1;
                      const h = maxY - minY + 1;
                      const bw = Math.min(3, Math.max(1, Math.min(w, h)));
                      const offsetTop = 1 + (bw - 1) * 0.25;
                      return (
                        <div
                          key={`key-outline-${idx}`}
                          className="absolute pointer-events-none border-yellow-400 shadow-[0_0_0_1px_rgba(0,0,0,0.6)] rounded-[1px] flex items-center justify-center"
                          style={{
                            borderWidth: bw,
                            left: minX * cellSize + 1,
                            top: (gridData.height - minY - (maxY - minY + 1)) * cellSize + offsetTop,
                            width: (maxX - minX + 1) * cellSize,
                            height: (maxY - minY + 1) * cellSize,
                            zIndex: 16
                          }}
                        >
                          <span className="text-[8px] bg-yellow-400 text-black px-0.5 rounded font-bold opacity-80">KEY {idx}</span>
                        </div>
                      );
                    })}

                    {/* Gate Outlines */}
                    {gates.map((gate, idx) => {
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      gate.points.forEach(p => {
                        minX = Math.min(minX, p.X);
                        minY = Math.min(minY, p.Y);
                        maxX = Math.max(maxX, p.X);
                        maxY = Math.max(maxY, p.Y);
                      });

                      let hMinX = Infinity, hMinY = Infinity, hMaxX = -Infinity, hMaxY = -Infinity;
                      gate.headPoints.forEach(p => {
                        hMinX = Math.min(hMinX, p.X);
                        hMinY = Math.min(hMinY, p.Y);
                        hMaxX = Math.max(hMaxX, p.X);
                        hMaxY = Math.max(hMaxY, p.Y);
                      });
                      
                      const color = getMaterialColor(gate.material);
                      const arrowSize = cellSize * 1.2;
                      
                      return (
                        <div key={`gate-group-${idx}`}>
                          {/* Full Gate Outline */}
                          <div
                            className="absolute pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.6)] rounded-[1px] flex items-center justify-center"
                            style={{
                              border: `2px solid ${color}`,
                              backgroundColor: `${color}11`,
                              left: (minX * cellSize) || 0,
                              top: ((gridData.height - 1 - maxY) * cellSize) || 0,
                              width: ((maxX - minX + 1) * cellSize) || 0,
                              height: ((maxY - minY + 1) * cellSize) || 0,
                              zIndex: 16
                            }}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] bg-primary text-primary-foreground px-0.5 rounded font-bold opacity-80">GATE {idx}</span>
                              <span className="text-[7px] font-bold" style={{ color: color, textShadow: '0 0 2px #000' }}>
                                L:{gate.length} C:{gate.count}
                              </span>
                            </div>
                          </div>

                          {/* Head Highlight */}
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              border: `2px solid ${color}`,
                              backgroundColor: `${color}44`,
                              left: hMinX * cellSize,
                              top: (gridData.height - 1 - hMaxY) * cellSize,
                              width: (hMaxX - hMinX + 1) * cellSize,
                              height: (hMaxY - hMinY + 1) * cellSize,
                              zIndex: 17
                            }}
                          />

                          {/* Barrier Arrow */}
                          <div
                            className="absolute pointer-events-none flex items-center justify-center"
                            style={{
                              left: hMinX * cellSize,
                              top: (gridData.height - 1 - hMaxY) * cellSize,
                              width: (hMaxX - hMinX + 1) * cellSize,
                              height: (hMaxY - hMinY + 1) * cellSize,
                              zIndex: 18
                            }}
                          >
                            <div 
                              className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                              style={{ 
                                fontSize: arrowSize,
                                transform: gate.direction === FacingDirection.Right ? 'rotate(0deg)' :
                                           gate.direction === FacingDirection.Down ? 'rotate(90deg)' :
                                           gate.direction === FacingDirection.Left ? 'rotate(180deg)' :
                                           'rotate(270deg)'
                              }}
                            >
                              ➜
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pipe Outlines */}
                    {pixelPipes.map((pipe, idx) => {
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      pipe.points.forEach(p => {
                        minX = Math.min(minX, p.X);
                        minY = Math.min(minY, p.Y);
                        maxX = Math.max(maxX, p.X);
                        maxY = Math.max(maxY, p.Y);
                      });
                      const w = maxX - minX + 1;
                      const h = maxY - minY + 1;
                      const bw = Math.min(3, Math.max(1, Math.min(w, h)));
                      const offsetTop = 1 + (bw - 1) * 0.25;
                      return (
                        <div
                          key={`pipe-outline-${idx}`}
                          className="absolute pointer-events-none border-blue-400 shadow-[0_0_0_1px_rgba(0,0,0,0.6)] rounded-[1px] flex items-center justify-center"
                          style={{
                            borderWidth: bw,
                            left: (minX * cellSize + 1) || 0,
                            top: ((gridData.height - minY - (maxY - minY + 1)) * cellSize + offsetTop) || 0,
                            width: ((maxX - minX + 1) * cellSize) || 0,
                            height: ((maxY - minY + 1) * cellSize) || 0,
                            zIndex: 16
                          }}
                        >
                          <span className="text-[8px] bg-blue-400 text-white px-0.5 rounded font-bold opacity-80">PIPE {idx}</span>
                        </div>
                      );
                    })}

                    {/* Surprise Pixels */}
                    {Array.from(surprisePixels).map((s, idx) => {
                      const [x, y] = (s as string).split(",").map(Number);
                      return (
                        <div
                          key={`surprise-${idx}`}
                          className="absolute pointer-events-none flex items-center justify-center text-white font-bold"
                          style={{
                            left: (x * cellSize + 1) || 0,
                            top: ((gridData.height - 1 - y) * cellSize + 1.5) || 0,
                            width: cellSize || 16,
                            height: cellSize || 16,
                            zIndex: 17,
                            fontSize: Math.max(6, cellSize * 0.8) || 8
                          }}
                        >
                          ?
                        </div>
                      );
                    })}

                  {/* X axis labels */}
                  <div className="flex mt-0.5 ml-[1px]" style={{ width: (gridData.width * cellSize) || 0 }}>
                    {Array.from({ length: gridData.width }, (_, x) => (
                      <div key={x} className="text-[7px] font-mono text-muted-foreground text-center" style={{ width: cellSize || 16 }}>
                        {x % 5 === 0 ? x : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <Grid3X3 className="w-12 h-12 opacity-30" />
                <p>Upload ảnh để bắt đầu</p>
              </div>
            )}
          </div>

          {/* Right panel: Controls + Selection Actions */}
          <div className="space-y-4 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto pr-2 custom-scrollbar">
            {/* Brush Mode Panel */}
            <div className="bg-card rounded-xl border p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paintbrush className={`w-4 h-4 ${isBrushMode ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">Brush Mode</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
                    <ArrowRightLeft className="w-3 h-3 rotate-180" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
                    <ArrowRightLeft className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant={isBrushMode ? "default" : "outline"} 
                    size="sm" 
                    className={`h-7 px-3 text-[10px] font-bold ${isBrushMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                    onClick={() => setIsBrushMode(!isBrushMode)}
                  >
                    {isBrushMode ? "ON" : "SELECT"}
                  </Button>
                </div>
              </div>
              
              {isBrushMode && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Brush Type Selection */}
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    <Button 
                      variant={brushType === 'brush' ? "default" : "ghost"} 
                      size="sm" 
                      className={`h-7 flex-1 text-[10px] font-bold gap-1 ${brushType === 'brush' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                      onClick={() => setBrushType('brush')}
                    >
                      <Paintbrush className="w-3 h-3" /> BRUSH
                    </Button>
                    <Button 
                      variant={brushType === 'fill' ? "default" : "ghost"} 
                      size="sm" 
                      className={`h-7 flex-1 text-[10px] font-bold gap-1 ${brushType === 'fill' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                      onClick={() => setBrushType('fill')}
                    >
                      <PaintBucket className="w-3 h-3" /> FILL
                    </Button>
                  </div>

                  <div className="grid grid-cols-8 gap-1.5">
                    {/* Transparent/Delete button */}
                    <button
                      className={`aspect-square rounded border-2 flex items-center justify-center transition-colors ${brushColorId === -1 ? 'border-destructive ring-2 ring-destructive ring-offset-1' : 'border-destructive/30 hover:bg-destructive/10'}`}
                      title="Brush: Xóa màu"
                      onClick={() => {
                        setBrushColorId(-1);
                        if (selectedCells.size > 0) {
                          applyColorToSelection(-1);
                          setSelectedCells(new Set());
                        }
                      }}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                    {/* Surprise Pixel button */}
                    <button
                      className={`aspect-square rounded border-2 flex items-center justify-center transition-colors relative ${brushColorId === -2 ? 'border-primary ring-2 ring-primary ring-offset-1 bg-primary/10' : 'border-primary/30 hover:bg-primary/10'}`}
                      title="Brush: Surprise Pixel (?)"
                      onClick={() => {
                        setBrushColorId(-2);
                        if (selectedCells.size > 0) {
                          applyColorToSelection(-2);
                          setSelectedCells(new Set());
                        }
                      }}
                    >
                      <span className="font-bold text-primary">?</span>
                    </button>
                    {(levelIdxArray.length > 0 ? levelIdxArray : masterPalette.map((_, i) => i)).map((id) => (
                      <button
                        key={`brush-${id}`}
                        className={`aspect-square rounded border transition-all relative ${brushColorId === id ? 'ring-2 ring-primary ring-offset-1 scale-110 z-10' : 'border-border hover:scale-105'}`}
                        style={{ backgroundColor: masterPalette[id] }}
                        title={`Brush ID:${id}`}
                        onClick={() => {
                          setBrushColorId(id);
                          if (selectedCells.size > 0) {
                            applyColorToSelection(id);
                            setSelectedCells(new Set());
                          }
                        }}
                      >
                        <span className="absolute bottom-0.5 left-0 right-0 text-[8px] text-center font-bold font-mono" style={{ color: '#fff', textShadow: '0 0 2px #000' }}>
                          {id}
                        </span>
                      </button>
                    ))}
                  </div>
                  {brushColorId !== null && selectedCells.size > 0 && (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 h-8 text-[10px] font-bold" 
                        onClick={() => applyColorToSelection(brushColorId)}
                      >
                        APPLY ({selectedCells.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selection Actions Panel */}
            <div data-color-picker className="bg-card rounded-xl border p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-foreground uppercase">
                  {selectedCells.size > 0 ? `Thao tác ${selectedCells.size} pixel` : "Màu đang dùng"}
                </h3>
                {selectedCells.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 gap-2 text-[10px] font-bold text-muted-foreground hover:text-foreground" onClick={() => setSelectedCells(new Set())}>
                    <X className="w-3 h-3" /> CLEAR
                  </Button>
                )}
              </div>

              {gridData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider">Màu đang dùng ({usedIds.length})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {usedIds.map((id) => {
                      const count = colorCounts.get(id) || 0;
                      return (
                        <div key={id} className="relative group aspect-square">
                          <button
                            className="w-full h-full rounded border border-border flex flex-col items-center justify-center overflow-hidden transition-transform hover:scale-110 active:scale-95"
                            style={{ backgroundColor: masterPalette[id] }}
                            title={`ID:${id} — Count: ${count} (Click để đổi màu toàn bộ)`}
                            onClick={() => setReplacingColorId(id)}
                          >
                            <span className="text-[10px] font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-white">
                              {count}
                            </span>
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 text-center text-[7px] text-white font-bold font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none">
                            {id}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {replacingColorId !== null && (
                    <div className="bg-muted/50 p-3 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase">Thay thế màu ID:{replacingColorId}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplacingColorId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {(levelIdxArray.length > 0 ? levelIdxArray : masterPalette.map((_, i) => i)).map((id) => (
                          <button
                            key={`replace-${id}`}
                            className={`aspect-square rounded border ${replacingColorId === id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                            style={{ backgroundColor: masterPalette[id] }}
                            disabled={replacingColorId === id}
                            onClick={() => replaceGlobalColor(replacingColorId, id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCells.size > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-[10px] text-muted-foreground italic">
                        * Click vào màu ở trên để tô nhanh cho {selectedCells.size} pixel đang chọn.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedCells.size === 0 && !gridData && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                  <Palette className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs font-medium">Chọn pixel trên grid để thao tác</p>
                </div>
              )}

              {/* Persistent Lists (Block, Key, Pipe) */}
              <div className="space-y-4 pt-4 border-t">
                {/* Block List */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Combine className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Block {mergedBlocks.length > 0 && <span className="ml-1 bg-primary text-primary-foreground px-1.5 rounded-full text-[9px] min-w-[16px] inline-flex items-center justify-center h-4">{mergedBlocks.length}</span>}
                    </span>
                  </div>

                  {/* Block Actions */}
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1 font-bold flex-1" 
                      onClick={mergeSelection}
                      disabled={selectedCells.size === 0}
                    >
                      <Combine className="w-3 h-3" /> GỘP BLOCK
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1 font-bold flex-1" 
                      onClick={deletePointBlock}
                      disabled={selectedCells.size === 0}
                    >
                      <Trash2 className="w-3 h-3" /> XÓA POINT
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1 font-bold flex-1" 
                      onClick={deleteBlock}
                      disabled={selectedCells.size === 0}
                    >
                      <Trash2 className="w-3 h-3" /> XÓA BLOCK
                    </Button>
                  </div>

                  {mergedBlocks.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {mergedBlocks.map((b, i) => (
                        <div key={`block-item-${i}`} className="flex items-center justify-between bg-muted/30 p-1.5 rounded text-[10px] font-mono border border-border/50">
                          <button 
                            className="flex flex-col flex-1 text-left hover:bg-primary/5 p-1 rounded transition-colors"
                            onClick={() => setEditingBlockIdx(i)}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm border border-white/20" style={{ backgroundColor: masterPalette[b.material] }} />
                              <span className="font-bold text-primary text-[12px]">BLOCK {i}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground ml-4">{b.w}x{b.h} (ID:{b.material} - {masterPalette[b.material]})</span>
                          </button>
                          <div className="flex items-center gap-1 mr-2">
                            <span className="text-[10px] text-muted-foreground">HP:</span>
                            <Input 
                              type="number" 
                              value={b.health} 
                              onChange={(e) => updateBlockHealth(i, parseInt(e.target.value) || 0)}
                              className="h-7 w-24 text-[12px] px-1.5 font-mono bg-background"
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/10" onClick={() => deleteBlockByIndex(i)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Key Section */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Key {keys.length > 0 && <span className="ml-1 bg-primary text-primary-foreground px-1.5 rounded-full text-[9px] min-w-[16px] inline-flex items-center justify-center h-4">{keys.length}</span>}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-9 gap-2 text-xs font-bold bg-muted/50" 
                    onClick={mergeKey}
                  >
                    <Key className="w-4 h-4" /> GỘP KEY
                  </Button>
                  {keys.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {keys.map((k, i) => (
                        <div key={`key-item-${i}`} className="flex items-center justify-between bg-muted/30 p-1.5 rounded text-[10px] font-mono">
                          <span>KEY {i} ({k.points.length} pts)</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteKey(i)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipe Section */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Pixel Pipe {pixelPipes.length > 0 && <span className="ml-1 bg-primary text-primary-foreground px-1.5 rounded-full text-[9px] min-w-[16px] inline-flex items-center justify-center h-4">{pixelPipes.length}</span>}
                    </span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-9 gap-2 text-xs font-bold bg-muted/50" 
                    onClick={mergePipe}
                  >
                    <Wind className="w-4 h-4" /> GỘP PIPE (3x3/4x4)
                  </Button>

                  {pixelPipes.length > 0 && (
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                      {pixelPipes.map((p, pipeIdx) => (
                        <div key={`pipe-item-${pipeIdx}`} className="bg-muted/30 p-2 rounded-lg space-y-2 border border-border/50">
                          <div className="flex items-center justify-between border-b border-border/50 pb-1">
                            <span className="text-[10px] font-bold uppercase tracking-tight">Pipe {pipeIdx}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deletePipe(pipeIdx)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="space-y-1.5">
                            {p.queue.map((q, groupIdx) => (
                              <div key={`pipe-${pipeIdx}-group-${groupIdx}`} className="flex items-center gap-2 bg-background/40 p-1.5 rounded border border-border/30">
                                <span className="text-[10px] font-mono w-3 text-muted-foreground">{groupIdx}</span>
                                <button 
                                  className="w-6 h-6 rounded border border-white/20 shadow-sm" 
                                  style={{ backgroundColor: masterPalette[q.Material] }}
                                  onClick={() => setEditingPipeGroup({ pipeIdx, groupIdx })}
                                />
                                <Input
                                  type="number"
                                  value={q.Count}
                                  onChange={(e) => updatePipeGroupCount(pipeIdx, groupIdx, parseInt(e.target.value) || 0)}
                                  className="h-6 text-[10px] flex-1 font-mono bg-background/50 border-none px-1"
                                  placeholder="Input Count"
                                />
                                <button 
                                  className="h-6 w-6 flex items-center justify-center border border-destructive/50 rounded text-destructive hover:bg-destructive/10"
                                  onClick={() => removePipeGroupFromExisting(pipeIdx, groupIdx)}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full h-7 text-primary hover:bg-primary/10 gap-1 text-[10px]"
                            onClick={() => addPipeGroupToExisting(pipeIdx)}
                          >
                            <Plus className="w-3 h-3" /> ADD GROUP
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gate List */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Gate {gates.length > 0 && <span className="ml-1 bg-primary text-primary-foreground px-1.5 rounded-full text-[9px] min-w-[16px] inline-flex items-center justify-center h-4">{gates.length}</span>}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1 font-bold" 
                      onClick={addGateFromSelection}
                      disabled={selectedCells.size === 0}
                    >
                      <Plus className="w-3 h-3" /> Thêm Gate
                    </Button>
                  </div>

                  {gates.length > 0 && (
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {gates.map((gate, idx) => {
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        gate.headPoints.forEach(p => {
                          minX = Math.min(minX, p.X);
                          minY = Math.min(minY, p.Y);
                          maxX = Math.max(maxX, p.X);
                          maxY = Math.max(maxY, p.Y);
                        });
                        const hw = maxX - minX + 1;
                        const hh = maxY - minY + 1;

                        return (
                          <div key={idx} className="bg-muted/30 p-2 rounded-lg space-y-2 border border-border/50 relative">
                            <div className="text-[10px] font-bold uppercase tracking-tight border-b border-border/50 pb-1 mb-1">
                              Gate {idx} (HEAD {hw}x{hh}, BARRIER {gate.length})
                            </div>
                            
                            <div className="flex items-end gap-2">
                              <div className="flex-1 min-w-[80px] space-y-1">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold block">Direction</span>
                                <select 
                                  className="w-full h-8 text-[10px] bg-background border rounded px-1"
                                  value={gate.direction}
                                  onChange={(e) => updateGate(idx, { direction: parseInt(e.target.value) })}
                                >
                                  <option value={FacingDirection.Left}>Left</option>
                                  <option value={FacingDirection.Up}>Up</option>
                                  <option value={FacingDirection.Right}>Right</option>
                                  <option value={FacingDirection.Down}>Down</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold block">Color</span>
                                <button 
                                  className="w-8 h-8 rounded border border-white/20 shadow-sm transition-transform hover:scale-105 active:scale-95" 
                                  style={{ backgroundColor: masterPalette[gate.material] }}
                                  onClick={() => setEditingGateColorIdx(idx)}
                                />
                              </div>

                              <div className="w-14 space-y-1">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold block">Barrier</span>
                                <Input 
                                  type="number" 
                                  className="h-8 text-[10px] font-mono px-1" 
                                  value={gate.length}
                                  onChange={(e) => updateGate(idx, { length: parseInt(e.target.value) || 1 })}
                                />
                              </div>

                              <div className="w-14 space-y-1">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold block">Count</span>
                                <Input 
                                  type="number" 
                                  className="h-8 text-[10px] font-mono px-1" 
                                  value={gate.count}
                                  onChange={(e) => updateGate(idx, { count: parseInt(e.target.value) || 0 })}
                                />
                              </div>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                onClick={() => deleteGate(idx)}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>

                            {editingGateColorIdx === idx && (
                              <div className="absolute inset-0 bg-background/95 z-20 p-2 rounded-lg border shadow-xl animate-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold">CHỌN MÀU GATE</span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingGateColorIdx(null)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-6 gap-1">
                                  {levelIdxArray.map((id: any) => (
                                    <button
                                      key={`gate-color-${id}`}
                                      className={`aspect-square rounded border ${gate.material === id ? 'ring-2 ring-primary' : ''}`}
                                      style={{ backgroundColor: masterPalette[id] }}
                                      onClick={() => {
                                        updateGate(idx, { material: id as number });
                                        setEditingGateColorIdx(null);
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hover Info */}
            {hoveredCell && gridData && (
              <div className="bg-card rounded-xl border p-3 text-sm space-y-1 shadow-sm">
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Thông tin pixel</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tọa độ</p>
                    <p className="font-mono text-xs">({hoveredCell.x}, {toDisplayY(hoveredCell.y)})</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Material ID</p>
                    <p className="font-mono text-xs">{gridData.grid[hoveredCell.y]?.[hoveredCell.x]}</p>
                  </div>
                </div>
              </div>
            )}
      </div>
    </div>
  </div>
</div>

{/* New Image Dialog */}
      <Dialog open={showNewLevelDialog} onOpenChange={setShowNewLevelDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Tạo Hình Ảnh Mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Chiều rộng</label>
                <Input type="number" value={newLevelW} onChange={(e) => setNewLevelW(parseInt(e.target.value) || 1)} className="h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Chiều cao</label>
                <Input type="number" value={newLevelH} onChange={(e) => setNewLevelH(parseInt(e.target.value) || 1)} className="h-8 text-xs font-mono" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Màu nền (Material ID)</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={newLevelBgId} onChange={(e) => setNewLevelBgId(parseInt(e.target.value) || -1)} className="h-8 text-xs font-mono flex-1" />
                <div className="w-8 h-8 rounded border border-border" style={{ backgroundColor: getMaterialColor(newLevelBgId) }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewLevelDialog(false)}>Hủy</Button>
            <Button size="sm" onClick={createNewLevel}>Tạo mới</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit color dialog */}
      <Dialog open={editingColorIdx !== null} onOpenChange={(open) => { if (!open) setEditingColorIdx(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Sửa màu ID:{editingColorIdx ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border border-border" style={{ backgroundColor: editColorValue }} />
            <Input value={editColorValue} onChange={(e) => setEditColorValue(e.target.value)} placeholder="#ff0000" className="font-mono" />
            <input type="color" value={editColorValue} onChange={(e) => setEditColorValue(e.target.value)} className="w-10 h-10 cursor-pointer rounded border-0" />
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setEditingColorIdx(null)}>Hủy</Button>
            <Button size="sm" onClick={confirmEditColor}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export palette dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Export Palette</DialogTitle>
          </DialogHeader>
          <Input value={paletteName} onChange={(e) => setPaletteName(e.target.value)} placeholder="Tên palette..." />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(false)}>Hủy</Button>
            <Button size="sm" onClick={() => { exportPaletteFile(); setShowSaveDialog(false); }}>Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />

      {/* Pipe Color Picker Dialog */}
      <Dialog open={editingPipeGroup !== null} onOpenChange={(open) => !open && setEditingPipeGroup(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Chọn màu cho Pipe</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-1.5 py-4">
            {levelIdxArray.map(id => (
              <button
                key={`picker-color-${id}`}
                className="aspect-square rounded border border-border hover:ring-2 ring-primary transition-all"
                style={{ backgroundColor: masterPalette[id] }}
                onClick={() => {
                  if (editingPipeGroup) {
                    updatePipeGroupMaterial(editingPipeGroup.pipeIdx, editingPipeGroup.groupIdx, id as number);
                  }
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Pipe Color Picker Dialog */}
      <Dialog open={editingNewPipeGroup !== null} onOpenChange={(open) => !open && setEditingNewPipeGroup(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Chọn màu</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-1.5 py-4">
            {levelIdxArray.map(id => (
              <button
                key={`new-picker-color-${id}`}
                className="aspect-square rounded border border-border hover:ring-2 ring-primary transition-all"
                style={{ backgroundColor: masterPalette[id] }}
                onClick={() => {
                  if (typeof editingNewPipeGroup === 'number') {
                    // If it was a group index in the new pipe queue
                    const newQueue = [...pipeQueue];
                    newQueue[editingNewPipeGroup].Material = id;
                    setPipeQueue(newQueue);
                  } else {
                    // If it was the material selector for adding new (passed as true)
                    setPipeQueueMaterial(id);
                  }
                  setEditingNewPipeGroup(null);
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Color Picker Dialog */}
      <Dialog open={editingBlockIdx !== null} onOpenChange={(open) => !open && setEditingBlockIdx(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Chọn màu cho Block</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-1.5 py-4">
            {levelIdxArray.map(id => (
              <button
                key={`block-picker-color-${id}`}
                className="aspect-square rounded border border-border hover:ring-2 ring-primary transition-all"
                style={{ backgroundColor: masterPalette[id] }}
                onClick={() => {
                  if (editingBlockIdx !== null) {
                    commitChange();
                    setMergedBlocks(prev => {
                      const next = [...prev];
                      const b = next[editingBlockIdx];
                      const oldMaterial = b.material;
                      b.material = id as number;
                      
                      // Update grid for this block
                      setGridData(current => {
                        if (!current) return null;
                        const g = current.grid.map(r => [...r]);
                        for (let dy = 0; dy < b.h; dy++) {
                          for (let dx = 0; dx < b.w; dx++) {
                            const iy = current.height - 1 - (b.y + dy);
                            if (iy >= 0 && iy < g.length && b.x + dx >= 0 && b.x + dx < g[0].length) {
                              g[iy][b.x + dx] = id as number;
                            }
                          }
                        }
                        return { ...current, grid: g };
                      });
                      
                      return next;
                    });
                    setEditingBlockIdx(null);
                  }
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Select MC Dialog */}
      <Dialog open={addingToCol !== null} onOpenChange={(open) => {
        if (!open) setAddingToCol(null);
        else setMcDialogAmmo(40);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select MC</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Type</span>
              <select 
                className="col-span-3 h-9 border rounded px-2"
                id="mc-type"
                defaultValue="Hole"
                onChange={(e) => {
                  const colorEl = document.getElementById('mc-color-group');
                  if (e.target.value === 'Lock') {
                    colorEl?.classList.add('hidden');
                  } else {
                    colorEl?.classList.remove('hidden');
                  }
                }}
              >
                <option value="Hole">Hole</option>
                <option value="Lock">Lock</option>
              </select>
            </div>
            <div id="mc-color-group" className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Color</span>
              <div className="col-span-3 flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 border rounded">
                {(levelIndices.size > 0 
                  ? (Array.from(levelIndices) as number[]).sort((a, b) => a - b) 
                  : Array.from({ length: masterPalette.length }, (_, i) => i))
                  .filter(id => (calculateRemainingColors()[id] || 0) > 0)
                  .map(id => {
                    const available = calculateRemainingColors()[id] || 0;
                    return (
                      <button
                        key={id}
                        id={`mc-color-${id}`}
                        className="mc-color-btn w-8 h-8 rounded border hover:ring-2 ring-primary transition-all relative flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: masterPalette[id] }}
                        onClick={() => {
                          document.querySelectorAll('.mc-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-primary'));
                          document.getElementById(`mc-color-${id}`)?.classList.add('ring-2', 'ring-primary');
                          (window as any).selectedMcColor = id;
                          
                          // Auto fill ammo: default 40, or actual if available < 40
                          const countInput = document.getElementById('mc-count') as HTMLInputElement;
                          const newAmmo = Math.min(40, available);
                          if (countInput) countInput.value = newAmmo.toString();

                          // Update remain
                          const remain = available - newAmmo;
                          const remainEl = document.getElementById('mc-remain');
                          if (remainEl) {
                            remainEl.innerText = remain.toString();
                            remainEl.style.color = remain < 0 ? 'red' : 'inherit';
                          }
                          const addBtn = document.getElementById('mc-add-btn') as HTMLButtonElement;
                          if (addBtn) addBtn.disabled = remain < 0;
                        }}
                      >
                        <span 
                          className="text-[11px] font-bold text-white uppercase"
                          style={{ textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000' }}
                        >
                          {available}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Hidden</span>
              <input type="checkbox" id="mc-hidden" className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Count</span>
              <Input 
                type="number" 
                id="mc-count" 
                value={mcDialogAmmo} 
                className="col-span-2" 
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  const color = (window as any).selectedMcColor;
                  if (color !== undefined) {
                    const counts = calculateRemainingColors();
                    const available = counts[color] || 0;
                    const finalAmmo = Math.min(val, available);
                    setMcDialogAmmo(finalAmmo);
                    
                    const remain = available - finalAmmo;
                    const remainEl = document.getElementById('mc-remain');
                    if (remainEl) {
                      remainEl.innerText = remain.toString();
                      remainEl.style.color = remain < 0 ? 'red' : 'inherit';
                    }
                    const addBtn = document.getElementById('mc-add-btn') as HTMLButtonElement;
                    if (addBtn) addBtn.disabled = remain < 0;
                  } else {
                    setMcDialogAmmo(val);
                  }
                }}
              />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Remain</span>
                <span id="mc-remain" className="text-sm font-bold">
                  {(() => {
                    const color = (window as any).selectedMcColor;
                    if (color !== undefined) {
                      const counts = calculateRemainingColors();
                      return (counts[color] || 0) - mcDialogAmmo;
                    }
                    return 0;
                  })()}
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="col-start-2 col-span-2 flex gap-1.5 mt-1">
                {[40, 30, 20, 10].map(val => (
                  <Button 
                    key={val} 
                    variant={mcDialogAmmo === val ? "default" : "outline"}
                    size="sm" 
                    className="h-7 px-2 text-[10px] flex-1"
                    onClick={() => {
                      const color = (window as any).selectedMcColor;
                      const counts = calculateRemainingColors();
                      const available = color !== undefined ? (counts[color] || 0) : Infinity;
                      const newVal = Math.min(val, available);
                      setMcDialogAmmo(newVal);

                      const remain = (color !== undefined ? (counts[color] || 0) : 0) - newVal;
                      const remainEl = document.getElementById('mc-remain');
                      if (remainEl) {
                        remainEl.innerText = remain.toString();
                        remainEl.style.color = remain < 0 ? 'red' : 'inherit';
                      }
                      const addBtn = document.getElementById('mc-add-btn') as HTMLButtonElement;
                      if (addBtn) addBtn.disabled = remain < 0;
                    }}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button id="mc-add-btn" onClick={() => {
              if (addingToCol === null) return;
              const type = (document.getElementById('mc-type') as HTMLSelectElement).value;
              const isHidden = (document.getElementById('mc-hidden') as HTMLInputElement).checked;
              const ammo = parseInt((document.getElementById('mc-count') as HTMLInputElement).value) || 0;
              const material = type === 'Lock' ? -1 : ((window as any).selectedMcColor ?? -1);
              
              if (type !== 'Lock' && material === -1) {
                toast.error("Vui lòng chọn màu");
                return;
              }

              const shootersInQueues = levelData?.QueueGroup.shooterQueues.flatMap(q => q.shooters) || [];
              const newId = shootersInQueues.length === 0 ? 0 : Math.max(0, ...shootersInQueues.map(s => s.id)) + 1;
              const newShooter: ShooterData = { id: newId, ammo, material };
              
              setLevelData(prev => {
                if (!prev) return null;
                const next = { ...prev };
                const queues = [...next.QueueGroup.shooterQueues];
                queues[addingToCol] = { shooters: [...queues[addingToCol].shooters, newShooter] };
                next.QueueGroup = { shooterQueues: queues };
                
                if (isHidden) {
                  next.SurpriseShooters = { Shooters: [...next.SurpriseShooters.Shooters, newId] };
                }
                if (type === 'Lock') {
                  next.Locks = { Shooters: [...next.Locks.Shooters, newId] };
                }
                
                return next;
              });
              setAddingToCol(null);
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update MC Dialog */}
      <Dialog 
        open={editingShooter !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingShooter(null);
          } else {
            setUpdateMcDialogAmmo(editingShooter?.data.ammo || 0);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update MC</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Type</span>
              <select 
                className="col-span-3 h-9 border rounded px-2"
                id="update-mc-type"
                defaultValue={editingShooter?.data.material === -1 ? "Lock" : "Hole"}
                onChange={(e) => {
                  const colorEl = document.getElementById('update-mc-color-group');
                  if (e.target.value === 'Lock') {
                    colorEl?.classList.add('hidden');
                  } else {
                    colorEl?.classList.remove('hidden');
                  }
                }}
              >
                <option value="Hole">Hole</option>
                <option value="Lock">Lock</option>
              </select>
            </div>
            <div id="update-mc-color-group" className={`grid grid-cols-4 items-center gap-4 ${editingShooter?.data.material === -1 ? 'hidden' : ''}`}>
              <span className="text-sm font-medium">Color</span>
              <div className="col-span-3 flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 border rounded">
                {(levelIndices.size > 0 
                  ? (Array.from(levelIndices) as number[]).sort((a, b) => a - b) 
                  : Array.from({ length: masterPalette.length }, (_, i) => i))
                  .filter(id => {
                    const counts = calculateRemainingColors();
                    const currentAmmo = editingShooter?.data.material === id ? editingShooter.data.ammo : 0;
                    return (counts[id] || 0) + currentAmmo > 0;
                  })
                  .map(id => {
                  const counts = calculateRemainingColors();
                  // For editing, we add back the current ammo to see true available
                  const currentAmmo = editingShooter?.data.material === id ? editingShooter.data.ammo : 0;
                  const available = (counts[id] || 0) + currentAmmo;
                  
                  return (
                    <button
                      key={id}
                      id={`update-mc-color-${id}`}
                      className={`update-mc-color-btn w-8 h-8 rounded border hover:ring-2 ring-primary transition-all relative flex items-center justify-center overflow-hidden ${editingShooter?.data.material === id ? 'ring-2 ring-primary' : ''}`}
                      style={{ backgroundColor: masterPalette[id] }}
                        onClick={() => {
                        document.querySelectorAll('.update-mc-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-primary'));
                        document.getElementById(`update-mc-color-${id}`)?.classList.add('ring-2', 'ring-primary');
                        (window as any).updateMcSelectedColor = id;
                        
                        // Auto fill ammo: default 40, or actual if available < 40
                        const newAmmo = Math.min(40, available);
                        setUpdateMcDialogAmmo(newAmmo);

                        // Update remain
                        const remain = available - newAmmo;
                        const remainEl = document.getElementById('update-mc-remain');
                        if (remainEl) {
                          remainEl.innerText = remain.toString();
                          remainEl.style.color = remain < 0 ? 'red' : 'inherit';
                        }
                        const applyBtn = document.getElementById('update-mc-apply-btn') as HTMLButtonElement;
                        if (applyBtn) applyBtn.disabled = remain < 0;
                      }}
                    >
                      <span 
                        className="text-[11px] font-bold text-white uppercase"
                        style={{ textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000' }}
                      >
                        {available}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Hidden</span>
              <input 
                type="checkbox" 
                id="update-mc-hidden" 
                className="w-4 h-4" 
                defaultChecked={editingShooter ? levelData?.SurpriseShooters.Shooters.includes(editingShooter.data.id) : false}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Count</span>
              <Input 
                type="number" 
                id="update-mc-count" 
                value={updateMcDialogAmmo} 
                className="col-span-2" 
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  const color = (window as any).updateMcSelectedColor ?? editingShooter?.data.material;
                  if (color !== undefined && color !== -1) {
                    const counts = calculateRemainingColors();
                    const currentAmmoValue = editingShooter?.data.material === color ? editingShooter.data.ammo : 0;
                    const available = (counts[color] || 0) + currentAmmoValue;
                    
                    const finalAmmo = Math.min(val, available);
                    setUpdateMcDialogAmmo(finalAmmo);

                    const remain = available - finalAmmo;
                    const remainEl = document.getElementById('update-mc-remain');
                    if (remainEl) {
                      remainEl.innerText = remain.toString();
                      remainEl.style.color = remain < 0 ? 'red' : 'inherit';
                    }
                    const applyBtn = document.getElementById('update-mc-apply-btn') as HTMLButtonElement;
                    if (applyBtn) applyBtn.disabled = remain < 0;
                  } else {
                    setUpdateMcDialogAmmo(val);
                  }
                }}
              />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Remain</span>
                <span id="update-mc-remain" className="text-sm font-bold">
                  {(() => {
                    const color = (window as any).updateMcSelectedColor ?? editingShooter?.data.material;
                    if (color !== undefined && color !== -1 && editingShooter) {
                      const counts = calculateRemainingColors();
                      const currentAmmoValue = editingShooter.data.material === color ? editingShooter.data.ammo : 0;
                      return (counts[color] || 0) + currentAmmoValue - updateMcDialogAmmo;
                    }
                    return 0;
                  })()}
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="col-start-2 col-span-2 flex gap-1.5 mt-1">
                {[40, 30, 20, 10].map(val => (
                  <Button 
                    key={val} 
                    variant={updateMcDialogAmmo === val ? "default" : "outline"}
                    size="sm" 
                    className="h-7 px-2 text-[10px] flex-1"
                    onClick={() => {
                      const color = (window as any).updateMcSelectedColor ?? editingShooter?.data.material;
                      const counts = calculateRemainingColors();
                      const currentAmmoValue = editingShooter?.data.material === color ? editingShooter.data.ammo : 0;
                      const available = (color !== undefined && color !== -1) ? ((counts[color] || 0) + currentAmmoValue) : Infinity;
                      
                      const newVal = Math.min(val, available);
                      setUpdateMcDialogAmmo(newVal);

                      const remain = available - newVal;
                      const remainEl = document.getElementById('update-mc-remain');
                      if (remainEl) {
                        remainEl.innerText = remain.toString();
                        remainEl.style.color = remain < 0 ? 'red' : 'inherit';
                      }
                      const applyBtn = document.getElementById('update-mc-apply-btn') as HTMLButtonElement;
                      if (applyBtn) applyBtn.disabled = remain < 0;
                    }}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => {
              if (editingShooter) {
                deleteShooter(editingShooter.col, editingShooter.idx);
                setEditingShooter(null);
              }
            }}>Delete</Button>
            <Button id="update-mc-apply-btn" onClick={() => {
              if (!editingShooter) return;
              const type = (document.getElementById('update-mc-type') as HTMLSelectElement).value;
              const isHidden = (document.getElementById('update-mc-hidden') as HTMLInputElement).checked;
              const ammo = parseInt((document.getElementById('update-mc-count') as HTMLInputElement).value) || 0;
              const material = type === 'Lock' ? -1 : ((window as any).updateMcSelectedColor ?? editingShooter.data.material);
              
              setLevelData(prev => {
                if (!prev) return null;
                const next = { ...prev };
                const queues = [...next.QueueGroup.shooterQueues];
                const shooters = [...queues[editingShooter.col].shooters];
                const shooterId = shooters[editingShooter.idx].id;
                
                shooters[editingShooter.idx] = { ...shooters[editingShooter.idx], ammo, material };
                queues[editingShooter.col] = { shooters };
                next.QueueGroup = { shooterQueues: queues };

                // Update SurpriseShooters
                let surprise = [...next.SurpriseShooters.Shooters];
                if (isHidden && !surprise.includes(shooterId)) {
                  surprise.push(shooterId);
                } else if (!isHidden && surprise.includes(shooterId)) {
                  surprise = surprise.filter(id => id !== shooterId);
                }
                next.SurpriseShooters = { Shooters: surprise };

                // Update Locks
                let locks = [...next.Locks.Shooters];
                if (type === 'Lock' && !locks.includes(shooterId)) {
                  locks.push(shooterId);
                } else if (type !== 'Lock' && locks.includes(shooterId)) {
                  locks = locks.filter(id => id !== shooterId);
                }
                next.Locks = { Shooters: locks };

                return next;
              });
              setEditingShooter(null);
              (window as any).updateMcSelectedColor = undefined;
            }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />

      <Dialog open={showResetPaletteDialog} onOpenChange={setShowResetPaletteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Palette</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">Bạn có muốn reset palette về mặc định?</p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowResetPaletteDialog(false)}>Hủy</Button>
            <Button onClick={() => {
              setMasterPalette([...DEFAULT_MASTER_PALETTE]);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_PALETTE));
              setShowResetPaletteDialog(false);
              toast.success("Đã reset palette về mặc định");
            }}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PixelGridConverter;
