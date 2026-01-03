export const defaultOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
      ret.id = ret._id;
      // delete ret._id; // Keep _id for frontend compatibility
    }
  }
};



