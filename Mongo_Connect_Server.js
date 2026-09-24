const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
const dateTimeModule = require('./Date_And_Time'); // Date and Time module import kiya gaya hai

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('Admission_Documents_Upload'));

// Local MongoDB Connection (School DB)
mongoose.connect('mongodb://127.0.0.1:27017/school_db')
  .then(() => console.log('MongoDB Connected to school_db!'))
  .catch((err) => console.error('Database Connection Error:', err));

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'faizankhan160118@gmail.com',
    pass: 'aebkjzvkfddhmsml'
  }
});

// 1. Notice Schema
const noticeSchema = new mongoose.Schema({
  title: String,
  date: String,
  description: String
});
const Notice = mongoose.model('Notice', noticeSchema);

// 2. Admission Inquiry Schema
const inquirySchema = new mongoose.Schema({
  studentName: String,
  parentPhone: String,
  classApply: String,
  message: String,
  date: { type: Date, default: Date.now }
});
const Inquiry = mongoose.model('Inquiry', inquirySchema);

// 3. Contact Us Schema (submittedAt / createdAt ke sath)
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date } // Yahan custom date aur time save hoga
});
const Contact = mongoose.model('Contact', contactSchema);

// 4. Admission Schema
const admissionSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  fatherName: { type: String, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  className: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String, required: true },
  document: { type: String },
  submittedAt: { type: Date }, 
  createdAt: { type: Date, default: Date.now }
});
const Admission = mongoose.model('Admission', admissionSchema);

// 5. Fee Structure Schema
const feeStructureSchema = new mongoose.Schema({
  className: { type: String, required: true, unique: true }, // Nursery, LKG, UKG, 1st to 5th
  pdfPath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

// 6. Popup Notice Schema (Naya Add kiya gaya hai)
const popupSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  title: { type: String, default: 'IMPORTANT NOTICE' },
  image: { type: String },
  message: { type: String }
});
const PopupNotice = mongoose.model('PopupNotice', popupSchema);

// Multer setup for file upload
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Admission_Documents_Upload/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// GET: Sabhi Notices dikhane ke liye
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find();
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: 'Notices fetch nahi ho paye' });
  }
});

// POST: Admission Inquiry Form submit karne ke liye
app.post('/api/inquiry', async (req, res) => {
  try {
    const newInquiry = new Inquiry(req.body);
    await newInquiry.save();
    res.status(201).json({ message: 'Admission Inquiry successfully send ho gayi!' });
  } catch (err) {
    res.status(500).json({ error: 'Inquiry send nahi ho payi' });
  }
});

// POST: Contact Us Form submit karne ke liye (Custom Date & Time ke sath)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const newContact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      createdAt: dateTimeModule.myDateTime()
    });
    await newContact.save();

    if (email) {
      const mailOptions = {
        from: 'faizankhan160118@gmail.com',
        to: email,
        subject: 'Message Received - Ghareeb Nawaz Academy',
        text: `Hello ${name},\n\nThank you for contacting Ghareeb Nawaz Academy. We have received your message and will get back to you soon.\n\nBest Regards,\nGhareeb Nawaz Academy\nFatehpur, UP`
      };
      transporter.sendMail(mailOptions, (err) => {
        if (err) console.log('Contact Email Error:', err);
      });
    }

    res.status(201).json({ success: true, message: 'Sandesh safalpurvak bhej diya gaya hai!' });
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).json({ success: false, error: 'Sandesh save nahi ho paya' });
  }
});

// GET: Saare admission forms ka data fetch karne ke liye
app.get('/api/admissions', async (req, res) => {
  try {
    const admissions = await Admission.find().sort({ createdAt: -1 });
    res.json(admissions);
  } catch (err) {
    console.error('Error fetching admissions:', err);
    res.status(500).json({ error: 'Admissions data fetch nahi ho paya' });
  }
});

// DELETE: Kisi specific admission ko ID ke zariye delete karne ke liye
app.delete('/api/admissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAdmission = await Admission.findByIdAndDelete(id);
    if (!deletedAdmission) {
      return res.status(404).json({ error: 'Admission record nahi mila' });
    }
    res.json({ message: 'Admission successfully delete ho gaya!' });
  } catch (err) {
    console.error('Error deleting admission:', err);
    res.status(500).json({ error: 'Server error ki wajah se delete nahi ho paya' });
  }
});

// Admission Form Submit Route with File Upload, Custom Date & Automatic Email
app.post('/api/admission', upload.single('document'), async (req, res) => {
  try {
    const admissionData = {
      ...req.body,
      document: req.file ? req.file.filename : '',
      submittedAt: dateTimeModule.myDateTime() 
    };

    const newAdmission = new Admission(admissionData);
    await newAdmission.save();

    if (req.body.email) {
      const mailOptions = {
        from: 'faizankhan160118@gmail.com',
        to: req.body.email,
        subject: 'Admission Application Received - Ghareeb Nawaz Academy',
        text: `Hello ${req.body.studentName},\n\nThank you for applying to Ghareeb Nawaz Academy for Class ${req.body.className}. We have successfully received your admission application.\n\nOur team will contact you soon!\n\nBest Regards,\nGhareeb Nawaz Academy\nFatehpur, UP`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log('Email error:', error);
      });
    }
    
    res.status(201).json({ success: true, message: 'Admission form successfully submit ho gaya hai!' });
  } catch (err) {
    console.error('Error saving admission:', err);
    res.status(500).json({ success: false, error: 'Admission form save nahi ho paya' });
  }
});

// --- FEE STRUCTURE ROUTES ---
app.post('/api/fees/upload', upload.single('feePdf'), async (req, res) => {
  try {
    const { className } = req.body;
    const pdfFileName = req.file ? req.file.filename : '';

    if (!className || !pdfFileName) {
      return res.status(400).json({ success: false, error: 'Class name aur PDF file dono zaroori hain!' });
    }

    let feeRecord = await FeeStructure.findOne({ className });
    if (feeRecord) {
      feeRecord.pdfPath = pdfFileName;
      await feeRecord.save();
    } else {
      feeRecord = new FeeStructure({
        className,
        pdfPath: pdfFileName
      });
      await feeRecord.save();
    }

    res.status(201).json({ success: true, message: 'Fee structure PDF successfully upload ho gayi hai!' });
  } catch (err) {
    console.error('Error uploading fee structure:', err);
    res.status(500).json({ success: false, error: 'Fee structure upload nahi ho paya' });
  }
});

app.get('/api/fees', async (req, res) => {
  try {
    const fees = await FeeStructure.find().sort({ createdAt: -1 });
    res.json(fees);
  } catch (err) {
    console.error('Error fetching fees:', err);
    res.status(500).json({ error: 'Fee structures fetch nahi ho paye' });
  }
});

app.delete('/api/fees/:id', async (req, res) => {
  try {
    await FeeStructure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fee structure successfully delete ho gaya!' });
  } catch (err) {
    console.error('Error deleting fee structure:', err);
    res.status(500).json({ error: 'Delete nahi ho paya' });
  }
});

// --- POPUP NOTICE ROUTES ---
app.get('/api/popup', async (req, res) => {
  try {
    let popup = await PopupNotice.findOne();
    if (!popup) {
      popup = new PopupNotice({ isActive: false });
      await popup.save();
    }
    res.json(popup);
  } catch (err) {
    res.status(500).json({ error: 'Popup data fetch nahi ho paya' });
  }
});

app.post('/api/popup/update', upload.single('image'), async (req, res) => {
  try {
    const { isActive, title, message } = req.body;
    let updateData = { 
      isActive: isActive === 'true' || isActive === true, 
      title, 
      message 
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    let popup = await PopupNotice.findOne();
    if (popup) {
      popup = await PopupNotice.findOneAndUpdate({}, updateData, { new: true });
    } else {
      popup = new PopupNotice(updateData);
      await popup.save();
    }

    res.json({ success: true, message: 'Popup successfully update ho gaya!', popup });
  } catch (err) {
    console.error('Popup update error:', err);
    res.status(500).json({ error: 'Popup update nahi ho paya' });
  }
});

// --- EXISTING ROUTES ---

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: 'Contact messages fetch nahi ho paye' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contact message successfully delete ho gaya!' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi ho paya' });
  }
});

// Gallery me upload ke liye data
const gallerySchema = new mongoose.Schema({
  title: String,
  category: String, 
  image: String,
  createdAt: { type: Date, default: Date.now }
});
const Gallery = mongoose.model('Gallery', gallerySchema);

app.post('/api/gallery/upload', upload.single('image'), async (req, res) => {
  try {
    const { title, category } = req.body;
    const imageName = req.file ? req.file.filename : '';
    
    const newImage = new Gallery({
      title,
      category,
      image: imageName
    });
    
    await newImage.save();
    res.json({ message: 'Photo successfully upload ho gayi!' });
  } catch (err) {
    res.status(500).json({ error: 'Upload karne me error aaya' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const images = await Gallery.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Data fetch nahi ho paya' });
  }
});

app.delete('/api/gallery/:id', async (req, res) => {
  try {
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ message: 'Photo successfully delete ho gayi!' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi ho paya' });
  }
});

// Announcements Routes
const Announcement = require('./Announcement');

app.get('/api/announcements', async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const newAnnouncement = new Announcement({
      date: req.body.date,
      title: req.body.title,
      description: req.body.description
    });
    await newAnnouncement.save();
    res.json({ message: "Announcement added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add announcement" });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: "Announcement deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send('School Website Backend API Running!');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

