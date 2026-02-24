const mongoose=require('mongoose');

const eventSchema=new mongoose.Schema({
    eventName:{
        type:String,
        required:[true,'Event name is required'],
        trim:true
    },
    description:{
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    type:{
        type: String,
        enum: ['normal', 'merchandise'],
        required: [true, 'Event type is required'],
        trim: true  
    },
    eligibility:{
        type: String,
        enum: ['open', 'member-only'],
        required: [true, 'Eligibility is required'],
        default: 'open',
        trim: true
    },
    status:{
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed'],
        default: 'draft',
        required: true
    },
    reg_deadline:{
        type: Date,
        required: [true, 'Registration deadline is required']
    },
    event_start:{
        type: Date,
        required: [true, 'Event start time is required']
    },
    event_end:{
        type: Date,
        required: [true, 'Event end time is required']
    },
    reg_limit:{
        type: Number,
        required: [true, 'Registration limit is required'],
        default: 100
    },
    reg_fee:{
        type: Number,
        required: [true, 'Registration fee is required'],
        default: 0
    },
    reg_count:{
        type: Number,
        default: 0
    },
    organizer_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Organizer ID is required']
    },
    event_tags:{
        type: [String],
        required: [true, 'At least one event tag is required'],
        default: ["fun!"]
    },
    customForm:{
        type: mongoose.Schema.Types.Mixed,
        default: [{
            id: 1,
            type: 'text',
            label: 'Full Name',
            required: true
        }]
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('Event',eventSchema);