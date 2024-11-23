from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from pymongo import MongoClient
import os
import subprocess
import PyPDF2  # For setting up PDF passwords

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'

# MongoDB setup using SRV string
MONGO_URI = "mongodb+srv://imdsa:imdsa@cluster0.uankn.mongodb.net/wordtopdf?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["wordtopdf"]  # Database name
metadata_collection = db["file_metadata"]  # Collection name

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Upload File
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    if file and file.filename.endswith('.docx'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Save metadata to MongoDB
        metadata = {"filename": filename, "filepath": filepath, "size": os.path.getsize(filepath)}
        result = metadata_collection.insert_one(metadata)

        # Add the inserted _id as a string to the metadata
        metadata["_id"] = str(result.inserted_id)
        return jsonify({"message": "File uploaded successfully", "metadata": metadata}), 200
    return jsonify({"error": "Unsupported file type. Only .docx files are allowed."}), 400

# Convert File to PDF
@app.route('/api/convert', methods=['POST'])
def convert_to_pdf():
    data = request.json
    filepath = data.get("filepath")
    setup_password = data.get("setup_password", False)  # Defaults to False
    password = data.get("password")  # Optional password, only used if setup_password is True

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        # Generate PDF path
        pdf_path = filepath.replace('.docx', '.pdf')

        # Use LibreOffice to convert .docx to .pdf
        command = [
            "soffice",  # LibreOffice CLI command
            "--headless",  # Run without GUI
            "--convert-to", "pdf",  # Conversion format
            "--outdir", app.config['UPLOAD_FOLDER'],  # Output directory
            filepath,  # Input file
        ]
        subprocess.run(command, check=True)

        # Handle password setup
        if setup_password:
            if not password:
                return jsonify({"error": "Password is required when setup_password is True"}), 400

            encrypted_pdf_path = pdf_path.replace('.pdf', '_encrypted.pdf')
            with open(pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                pdf_writer = PyPDF2.PdfWriter()
                pdf_writer.append_pages_from_reader(pdf_reader)
                pdf_writer.encrypt(password)
                with open(encrypted_pdf_path, 'wb') as encrypted_pdf:
                    pdf_writer.write(encrypted_pdf)
            os.remove(pdf_path)  # Remove the original unencrypted PDF
            pdf_path = encrypted_pdf_path

        # Return the PDF file
        return send_file(pdf_path, as_attachment=True)

    except subprocess.CalledProcessError as e:
        print(f"Error during LibreOffice conversion: {e}")
        return jsonify({"error": "An error occurred during PDF conversion"}), 500
    except Exception as e:
        print(f"Error during PDF encryption: {e}")
        return jsonify({"error": "An error occurred during PDF encryption"}), 500

# Fetch Metadata
@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    try:
        files = list(metadata_collection.find({}, {"_id": 0}))  # Exclude MongoDB's default _id field
        return jsonify(files)
    except Exception as e:
        print(f"Error fetching metadata: {e}")
        return jsonify({"error": "An error occurred while fetching metadata"}), 500

if __name__ == '__main__':
    app.run(debug=True)
