import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
}, {
  timestamps: true,
});

export default mongoose.models.Folder || mongoose.model('Folder', FolderSchema);
