package GED.ged_backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
public class OCRService {

    @Value("${app.ocr.tess-data-path}")
    private String tessDataPath;

    @Value("${app.ocr.default-language:fra}")
    private String defaultLanguage;

    public String extractText(InputStream inputStream) {
        return extractText(inputStream, null);
    }

    public String extractText(InputStream inputStream, String originalFilename) {
        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("ocr_", ".tmp");
            Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);

            // Use ImageIO.read() which detects format from content, not extension.
            // This avoids the "Bad PNG signature" error when extension (e.g. .png)
            // does not match the actual file content (e.g. JPEG photo).
            BufferedImage image = ImageIO.read(tempFile.toFile());
            if (image != null) {
                return extractText(image);
            }

            // Fallback for PDF or other formats ImageIO cannot handle
            return extractText(tempFile.toFile());
        } catch (IOException e) {
            throw new RuntimeException("Error creating temp file for OCR", e);
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {}
            }
        }
    }

    public String extractText(File imageFile) {
        ITesseract tesseract = new Tesseract();
        tesseract.setDatapath(tessDataPath);
        tesseract.setLanguage(defaultLanguage);
        try {
            return tesseract.doOCR(imageFile);
        } catch (TesseractException e) {
            // Log the error and return empty or partial text
            System.err.println("OCR Error: " + e.getMessage());
            return "";
        }
    }

    public String extractText(BufferedImage image) {
        ITesseract tesseract = new Tesseract();
        tesseract.setDatapath(tessDataPath);
        tesseract.setLanguage(defaultLanguage);
        try {
            return tesseract.doOCR(image);
        } catch (TesseractException e) {
            System.err.println("OCR Error: " + e.getMessage());
            return "";
        }
    }
}
