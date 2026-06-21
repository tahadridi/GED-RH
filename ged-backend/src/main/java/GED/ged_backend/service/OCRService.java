package GED.ged_backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Iterator;

@Service
public class OCRService {

    private static final Logger log = LoggerFactory.getLogger(OCRService.class);

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
            String ext = originalFilename != null
                ? originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase()
                : "unknown";
            tempFile = Files.createTempFile("ocr_", "." + ext);
            Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);

            log.info("OCR attempting to read file: format={}, path={}", ext, tempFile);

            // Handle PDF files via PDFBox
            if ("pdf".equals(ext)) {
                return extractTextFromPdf(tempFile.toFile());
            }

            BufferedImage image = ImageIO.read(tempFile.toFile());
            if (image != null) {
                log.info("OCR successfully read image via ImageIO, dimensions={}x{}", image.getWidth(), image.getHeight());
                return extractText(image);
            }

            // ImageIO returned null — try detecting format
            try (ImageInputStream iis = ImageIO.createImageInputStream(tempFile.toFile())) {
                Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
                if (readers.hasNext()) {
                    ImageReader reader = readers.next();
                    log.warn("OCR ImageIO found reader '{}' but read() returned null", reader.getFormatName());
                } else {
                    log.warn("OCR ImageIO found NO reader for format '{}'", ext);
                }
            }

            return "";
        } catch (Exception e) {
            log.error("OCR Error reading image", e);
            return "";
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (Exception ignored) {}
            }
        }
    }

    public String extractText(File imageFile) {
        try {
            BufferedImage image = ImageIO.read(imageFile);
            if (image != null) {
                log.info("OCR File->BufferedImage success: {}x{}", image.getWidth(), image.getHeight());
                return extractText(image);
            }
            log.warn("OCR could not read file as image: {}", imageFile.getName());
            return "";
        } catch (Exception e) {
            log.error("OCR Error reading file {}", imageFile.getName(), e);
            return "";
        }
    }

    private String extractTextFromPdf(File pdfFile) {
        log.info("OCR processing PDF: {}", pdfFile.getName());
        StringBuilder fullText = new StringBuilder();
        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            for (int page = 0; page < document.getNumberOfPages(); page++) {
                BufferedImage image = renderer.renderImageWithDPI(page, 300);
                String pageText = extractText(image);
                if (!pageText.isBlank()) {
                    fullText.append(pageText).append("\n");
                }
                image.flush();
            }
            log.info("OCR extracted {} chars from PDF ({} pages)", fullText.length(), document.getNumberOfPages());
        } catch (Exception e) {
            log.error("OCR Error processing PDF {}", pdfFile.getName(), e);
        }
        return fullText.toString().strip();
    }

    public String extractText(BufferedImage image) {
        ITesseract tesseract = new Tesseract();
        tesseract.setDatapath(tessDataPath);
        tesseract.setLanguage(defaultLanguage);
        try {
            return tesseract.doOCR(image);
        } catch (TesseractException e) {
            log.error("OCR Tesseract error", e);
            return "";
        }
    }
}
