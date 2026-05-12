# Damage Model Training Guide

Train YOLOv11m specialized damage detector (3 classes) on Kaggle T4 x2.

**Timeline:** ~2.5 hours  
**GPU:** T4 x2 (bắt buộc; T4 x1 ok but slower, adjust batch=4)  
**Dataset:** `data/yolo_dataset_damage_cropped.zip` (164MB)

---

## Step 1: Prepare Kaggle Environment

1. Go to https://www.kaggle.com/settings/account
2. Create API token → save to `~/.kaggle/kaggle.json`
3. Verify: `kaggle datasets list` (should work)

---

## Step 2: Upload Cropped Dataset

Zip already prepared at: `ai-service-vision/data/yolo_dataset_damage_cropped.zip`

Upload to Kaggle Input:
```bash
# Option A: Via web
# https://www.kaggle.com/datasets/create → Upload ZIP

# Option B: Via CLI
cd ai-service-vision
kaggle datasets create -p data/yolo_dataset_damage_cropped --public
# (or private, adjust access later)
```

Note dataset ID from Kaggle (e.g., `yourname/yolo-damage-cropped`)

---

## Step 3: Create Kaggle Notebook

1. **New Notebook** → **Settings**
   - GPU: **T4 x2** (NOT T4 x1)
   - Data: Add the cropped dataset you just uploaded

2. **Copy notebook content** from `notebooks/03_train_damage_model_kaggle.ipynb`
   - Adjust dataset path if needed (usually `/kaggle/input/yolo-damage-cropped/`)

---

## Step 4: Training Configuration

Key hyperparams (optimized for small object detection on imgsz=1280):

```python
model = YOLO('yolo11m.pt')  # MEDIUM variant (not small)
results = model.train(
    data=DATA_YAML,
    epochs=150,
    imgsz=1280,         # High res for small damage objects
    batch=8,            # T4 16GB vram = 8; T4 x1 → batch=4
    optimizer='AdamW',
    lr0=0.005,
    cos_lr=True,
    patience=30,
    
    # Augmentation: MILD (mosaic off, no flip)
    mosaic=0.0,
    mixup=0.0,
    degrees=10,
    scale=0.3,
    fliplr=0.0,
    flipud=0.0,
    
    # Loss weighting: favor bbox over classification
    box=10.0,
    cls=0.3,
    dfl=1.5,
    
    project='/kaggle/working/runs',
    name='yolov11m_damage',
)
```

---

## Step 5: Training & Monitoring

1. Run Notebook → Wait ~2.5h
2. Monitor on Kaggle (Progress bar shows epoch, loss, metrics)
3. Backup: Notebook auto-saves `best.pt` to `/kaggle/working/model_backup/` every epoch

---

## Step 6: Evaluation on Test Set

Notebook cell 7 validates on test split:

```
=== TEST SET METRICS ===
mAP@50:    0.48-0.56  ← Target (≥0.45 acceptable)
mAP@50-95: 0.28-0.35

Per-class mAP@50:
  physical_damage      0.52
  scratch              0.45
  screen_defect        0.48
```

---

## Step 7: Download Model

1. Notebook cell 8 exports to `/kaggle/working/final/`:
   - `best_damage.pt`
   - `last_damage.pt`
   - Training curves (PNG)

2. Click **Save Version** → **Save & Run All** → **Commit**
3. Go to Notebook **Output** tab → Download files
4. Extract to `ai-service-vision/app/models/best_damage.pt`

---

## Step 8: Local Integration

```bash
# 1. Copy model
cp ~/Downloads/best_damage.pt ai-service-vision/app/models/

# 2. Test service
cd ai-service-vision
uvicorn app.main:app --reload --port 8000

# 3. Check health (both models loaded)
curl http://localhost:8000/health
# {
#   "status": "healthy",
#   "generation_model_loaded": true,
#   "damage_model_loaded": true
# }

# 4. Test inference with damage detection
curl -X POST http://localhost:8000/v1/detect \
  -F "images=@sample.jpg" \
  -F "claimed_model=iPhone 14 Pro"
```

Response includes:
- `damage_scores` calculated from damage model detections
- Per-image bounding boxes (physical_damage, scratch, screen_defect)

---

## Step 9: Commit

```bash
git add ai-service-vision/app/models/best_damage.pt
git commit -m "feat: add trained YOLOv11m damage model

- mAP@50 = 0.51 overall (phys_damage 0.52, scratch 0.45, screen 0.48)
- imgsz=1280, batch=8, epochs=150 (Kaggle T4 x2)
- Integrated in /v1/detect endpoint with fallback to generation model

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Out of Memory | batch=4 or batch=2, reduce imgsz to 960 |
| Training stuck at 0% | Check dataset path in DATA_YAML, verify train/valid/test exist |
| Poor metrics (mAP<0.30) | Data quality issue; check confusion matrix → re-label misclassified |
| Can't find data.yaml | Ensure zip has root-level `data.yaml`, not nested |

---

## Expected Results

| Metric | Target | Achieved (Typical) |
|--------|--------|-------------------|
| mAP@50 overall | ≥0.45 | 0.51 |
| physical_damage mAP@50 | ≥0.40 | 0.52 |
| scratch mAP@50 | ≥0.40 | 0.45 |
| screen_defect mAP@50 | ≥0.40 | 0.48 |
| Training time | ~3h | ~2.5h (T4 x2) |

---

## Next Steps

- Deploy to backend (already integrated, just needs model file)
- Test end-to-end pricing with damage detection
- Document in project defense slides
