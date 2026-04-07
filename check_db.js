const mongoose = require('mongoose');

const dbUrl = "mongodb+srv://shyam:4xK1Iovn62p611N5@anitgravity.p022f.mongodb.net/?retryWrites=true&w=majority&appName=Anitgravity"; 
// Note: We need to load it properly if it is in .env.local, but for a quick script let's parse .env.local
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const realDbUrl = match ? match[1].trim() : dbUrl;

async function run() {
  await mongoose.connect(realDbUrl);
  
  const WorldSchema = new mongoose.Schema({
    userId: { type: String },
    name: { type: String },
    nodes: [mongoose.Schema.Types.Mixed],
    edges: [mongoose.Schema.Types.Mixed],
  });
  
  const World = mongoose.models.World || mongoose.model('World', WorldSchema);
  
  const world = await World.findOne();
  if (world) {
    console.log("Found world:", world._id, "Nodes:", world.nodes.length);
    for (const node of world.nodes) {
        console.log("- Node:", node.id, "Images count:", node.images ? node.images.length : 0);
        if (node.images && node.images.length > 0) {
            console.log("  first image url:", node.images[0].url);
        }
    }
  } else {
    console.log("No world found");
  }

  mongoose.disconnect();
}

run();
