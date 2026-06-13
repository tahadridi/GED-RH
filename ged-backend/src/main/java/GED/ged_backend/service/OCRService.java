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
            // Preserve extension so Tesseract can determine image format
            String suffix = ".tmp";
            if (originalFilename != null) {
                String lower = originalFilename.toLowerCase();
                if (lower.endsWith(".pdf")) suffix = ".pdf";
                else if (lower.endsWith(".png")) suffix = ".png";
                else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) suffix = ".jpg";
            }
            tempFile = Files.createTempFile("ocr_", suffix);
            Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
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
