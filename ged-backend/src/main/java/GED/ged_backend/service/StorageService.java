package GED.ged_backend.service;

import GED.ged_backend.config.MinioProperties;
import io.minio.*;
import io.minio.errors.*;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
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

    public String uploadFile(String fileName, InputStream inputStream, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(fileName)
                            .stream(inputStream, -1, 10485760) // 10MB part size
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
