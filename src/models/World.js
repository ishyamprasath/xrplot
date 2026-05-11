import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  classification: { type: String, default: '' }, // front, back, left, right, ceiling, floor, corner
});

const NodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: 'New Space' },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  images: [ImageSchema],
  panoramaUrl: { type: String, default: '' },
  panoramaPublicId: { type: String, default: '' },
  status: {
    type: String,
    enum: ['empty', 'uploaded', 'analyzing', 'stitching', 'ready', 'error'],
    default: 'empty',
  },
<<<<<<< HEAD
  workflows: [WorkflowSchema],
  isCentralNode: { type: Boolean, default: false },
  // Decade 2.0 — Predictive Intelligence Fields
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  predictionYear: { type: Number, default: null },
  urbanDensity: { type: Number, default: null },
  predictionConfidence: { type: Number, default: null },
  isPredictionNode: { type: Boolean, default: false },
  predictionType: { type: String, default: '' },
  geojsonHotspots: { type: mongoose.Schema.Types.Mixed, default: null },
  ndbiTrend: { type: [Number], default: [] },
=======
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
});

const EdgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  transitionImages: [ImageSchema],
  transitionPanorama: { type: String, default: '' },
  status: {
    type: String,
    enum: ['empty', 'uploaded', 'ready'],
    default: 'empty',
  },
});

const WorldSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, default: 'Untitled World' },
  description: { type: String, default: '' },
  nodes: [NodeSchema],
  edges: [EdgeSchema],
}, {
  timestamps: true,
});

export default mongoose.models.World || mongoose.model('World', WorldSchema);
