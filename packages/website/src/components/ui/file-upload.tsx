import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  hideSelectedFiles?: boolean;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function FileUpload({
  onFilesSelected,
  accept = { "audio/*": [".mp3", ".wav", ".flac", ".aac", ".ogg"] },
  maxFiles = 1,
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = false,
  disabled = false,
  className,
  children,
  hideSelectedFiles = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setErrors([]);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errorMessages = rejectedFiles.map((rejection: any) => {
          if (rejection.errors[0]?.code === "file-too-large") {
            return `${rejection.file.name} is too large. Max size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
          }
          if (rejection.errors[0]?.code === "file-invalid-type") {
            return `${rejection.file.name} is not a valid file type.`;
          }
          return `${rejection.file.name} was rejected.`;
        });
        setErrors(errorMessages);
      }

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        const newFiles = acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : undefined,
          })
        );

        setFiles(newFiles);
        onFilesSelected(newFiles);
      }
    },
    [maxSize, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple,
    disabled,
    noClick: false, // Allow clicking on the dropzone
    noKeyboard: false, // Allow keyboard interactions
  });

  const removeFile = (fileToRemove: FileWithPreview) => {
    const newFiles = files.filter((file) => file !== fileToRemove);
    setFiles(newFiles);
    onFilesSelected(newFiles);

    // Revoke preview URL if it exists
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {children || (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-muted-foreground">
              <Upload className="w-full h-full" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isDragActive ? "Drop files here" : "Drag and drop files here"}
              </p>
              <p className="text-xs text-muted-foreground">
                or click anywhere to browse files
              </p>
              <p className="text-xs text-muted-foreground">
                Max {Math.round(maxSize / 1024 / 1024)}MB per file
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && !hideSelectedFiles && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
              Selected Files
            </h4>
          </div>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg transition-all duration-200"
            >
              {file.type.startsWith("image/") ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <File className="w-6 h-6 text-muted-foreground m-2" />
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-green-800 dark:text-green-200">
                  {file.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {formatFileSize(file.size)} • Ready to upload
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/50"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file);
                }}
              >
                <X className="w-4 h-4 text-green-600 hover:text-green-800" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
