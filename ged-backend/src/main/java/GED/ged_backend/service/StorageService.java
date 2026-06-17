package GED.ged_backend.service;

import GED.ged_backend.config.MinioProperties;
import io.minio.*;
import io.minio.errors.*;
import io.minio.messages.Item;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class StorageService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    public StorageService(MinioClient minioClient, MinioProperties minioProperties) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        initializeBucket();
    }

    private void initializeBucket() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(minioProperties.getBucketName()).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(minioProperties.getBucketName()).build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Error initializing MinIO bucket", e);
        }
    }

    public Map<String, Object> getBucketStats() {
        long totalSize = 0;
        long objectCount = 0;
        try {
            var results = minioClient.listObjects(
                ListObjectsArgs.builder()
                    .bucket(minioProperties.getBucketName())
                    .recursive(true)
                    .build()
            );
            for (var result : results) {
                Item item = result.get();
                totalSize += item.size();
                objectCount++;
            }
        } catch (Exception e) {
            throw new RuntimeException("Error getting bucket stats", e);
        }
        return Map.of(
            "totalSize", totalSize,
            "objectCount", objectCount
        );
    }

    public Map<String, Object> getDiskInfo() {
        File root = new File(".");
        long total = root.getTotalSpace();
        long free = root.getUsableSpace();
        long used = total - free;
        return Map.of(
            "totalSpace", total,
            "usedSpace", used,
            "freeSpace", free
        );
    }

    public String uploadFile(String fileName, InputStream inputStream, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(fileName)
                            .stream(inputStream, -1, 10485760)
                            .contentType(contentType)
                            .build()
            );
            return fileName;
        } catch (Exception e) {
            throw new RuntimeException("Error uploading file to MinIO", e);
        }
    }

    public InputStream downloadFile(String fileName) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(fileName)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error downloading file from MinIO", e);
        }
    }

    public String getContentType(String fileName) {
        try {
            var stat = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(fileName)
                            .build()
            );
            return stat.contentType();
        } catch (Exception e) {
            return "application/octet-stream";
        }
    }

    public void deleteFile(String fileName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(fileName)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error deleting file from MinIO", e);
        }
    }

    public void copyFile(String sourceKey, String destKey) {
        try {
            minioClient.copyObject(
                    io.minio.CopyObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(destKey)
                            .source(io.minio.CopySource.builder()
                                    .bucket(minioProperties.getBucketName())
                                    .object(sourceKey)
                                    .build())
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error copying file in MinIO", e);
        }
    }
}
