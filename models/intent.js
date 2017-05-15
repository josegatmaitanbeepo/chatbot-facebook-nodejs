var mongoose = require("mongoose");

var intentSchema = mongoose.Schema(
	{
		intentDescription : String,
		archive: { type: Boolean, default: false },
		intentAIId: String,
		arTemplates: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "arTemplate"
			}
		]			
		
});

module.exports = mongoose.model("Intent", intentSchema);
