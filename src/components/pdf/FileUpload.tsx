'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { DocumentIcon, XMarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionTier, getFileSizeLimit, getUserStats, getMaxBatchSize } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // This will be limited by subscription tier
  accept?: Record<string, string[]>;
  multiple?: boolean;
  toolType?: 'compress' | 'merge' | 'split' | 'convert';
  onFileSizeError?: (message: string) => void; // Callback for file size errors
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesAccepted,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = { 'application/pdf': ['.pdf'] },
  multiple = false,
  toolType = 'compress',
  onFileSizeError,
}) => {
  const { t } = useTranslation();
  const { user, profile, isLoading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [subscriptionLimit, setSubscriptionLimit] = useState<number>(maxSize);
  const [remainingStorage, setRemainingStorage] = useState<number>(maxSize);
  const [showLimitInfo, setShowLimitInfo] = useState<boolean>(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [maxBatchLimit, setMaxBatchLimit] = useState<number>(multiple ? maxFiles : 1);

  // Get subscription limits based on user profile
  useEffect(() => {
    const fetchUserLimits = async () => {
      // Default to free tier limit if no profile is available
      const freeTierLimit = 10 * 1024 * 1024; // 10MB for free tier
      const freeTierBatchLimit = 1; // No batch processing for free tier

      if (user) {
        try {
          // Fetch the user's stats from Supabase
          const stats = await getUserStats(user.id);

          if (stats) {
            console.log('User stats fetched for file upload:', stats);
            setUserStats(stats);

            // Set the file size limit based on the user's subscription
            const fileSizeBytes = stats.max_file_size_mb * 1024 * 1024;
            setSubscriptionLimit(fileSizeBytes);

            // Calculate remaining storage based on daily/monthly limits
            // For simplicity, we'll just use the max file size as the remaining storage
            setRemainingStorage(fileSizeBytes);

            // Set the batch limit based on the user's subscription
            setMaxBatchLimit(stats.max_batch_size);

            console.log(`User limits set: ${formatFileSize(fileSizeBytes)} max file size, ${stats.max_batch_size} max batch size`);
          } else {
            console.log('No user stats available, using free tier limits');
            setSubscriptionLimit(freeTierLimit);
            setRemainingStorage(freeTierLimit);
            setMaxBatchLimit(freeTierBatchLimit);
          }
        } catch (error) {
          console.error('Error fetching user stats:', error);
          // Fall back to free tier limits
          setSubscriptionLimit(freeTierLimit);
          setRemainingStorage(freeTierLimit);
          setMaxBatchLimit(freeTierBatchLimit);
        }
      } else if (profile) {
        // Backward compatibility with old profile format
        const tierLimit = profile.file_size_limit || freeTierLimit;
        const usedStorage = profile.usage || 0;
        const totalStorage = profile.file_size_limit || freeTierLimit;
        const remaining = Math.max(0, totalStorage - usedStorage);
        const batchLimit = getMaxBatchSize(profile.subscription_tier as SubscriptionTier);

        setSubscriptionLimit(tierLimit);
        setRemainingStorage(remaining);
        setMaxBatchLimit(batchLimit);

        console.log(`Using profile data: ${formatFileSize(tierLimit)} max file size, ${batchLimit} max batch size`);
      } else {
        // No user or profile available (unauthenticated user) - enforce free tier limit
        console.log(`No user profile available. Enforcing free tier limit of ${formatFileSize(freeTierLimit)}`);
        setSubscriptionLimit(freeTierLimit);
        setRemainingStorage(freeTierLimit);
        setMaxBatchLimit(freeTierBatchLimit);
      }
    };

    fetchUserLimits();
  }, [user, profile, maxSize, multiple, maxFiles]);

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files (too large, wrong type, etc.)
      if (rejectedFiles.length > 0) {
        const fileSizeErrors = rejectedFiles.filter(file =>
          file.errors.some((err: any) => err.code === 'file-too-large')
        );

        if (fileSizeErrors.length > 0) {
          const file = fileSizeErrors[0].file;
          const fileSize = file.size;

          // Check if file exceeds subscription limit
          if (fileSize > subscriptionLimit) {
            let errorMessage;

            if (profile) {
              // Authenticated user with profile
              const tierName = profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1);
              errorMessage = `File size (${formatFileSize(fileSize)}) exceeds your ${tierName} plan limit of ${formatFileSize(profile.file_size_limit)}.`;
            } else {
              // Unauthenticated user - free tier limit
              errorMessage = `File size (${formatFileSize(fileSize)}) exceeds the free plan limit of ${formatFileSize(subscriptionLimit)}.`;
            }

            toast.error(errorMessage);
            if (onFileSizeError) onFileSizeError(errorMessage);
            setShowLimitInfo(true);
            return;
          }

          // Check if file exceeds remaining storage (only for authenticated users)
          if (profile && fileSize > (profile.file_size_limit - profile.usage)) {
            const errorMessage = `File size (${formatFileSize(fileSize)}) exceeds your remaining storage of ${formatFileSize(profile.file_size_limit - profile.usage)}.`;
            toast.error(errorMessage);
            if (onFileSizeError) onFileSizeError(errorMessage);
            setShowLimitInfo(true);
            return;
          }

          // Generic size error
          toast.error(`File is too large. Maximum size is ${formatFileSize(subscriptionLimit)}.`);
          return;
        }

        // Handle other rejection reasons
        const otherErrors = rejectedFiles.filter(file =>
          file.errors.some((err: any) => err.code !== 'file-too-large')
        );

        if (otherErrors.length > 0) {
          toast.error('Invalid file. Please upload a PDF file.');
          return;
        }
      }

      // If files are accepted, check against subscription limits
      if (acceptedFiles.length > 0) {
        const totalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);

        // Check if total size exceeds subscription limit
        if (totalSize > subscriptionLimit) {
          let errorMessage;

          if (profile) {
            // Authenticated user with profile
            const tierName = profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1);
            errorMessage = `Total file size (${formatFileSize(totalSize)}) exceeds your ${tierName} plan limit of ${formatFileSize(profile.file_size_limit)}.`;
          } else {
            // Unauthenticated user - free tier limit
            errorMessage = `Total file size (${formatFileSize(totalSize)}) exceeds the free plan limit of ${formatFileSize(subscriptionLimit)}.`;
          }

          toast.error(errorMessage);
          if (onFileSizeError) onFileSizeError(errorMessage);
          setShowLimitInfo(true);
          return;
        }

        // Check if total size exceeds remaining storage (only for authenticated users)
        if (profile && totalSize > (profile.file_size_limit - profile.usage)) {
          const errorMessage = `Total file size (${formatFileSize(totalSize)}) exceeds your remaining storage of ${formatFileSize(profile.file_size_limit - profile.usage)}.`;
          toast.error(errorMessage);
          if (onFileSizeError) onFileSizeError(errorMessage);
          setShowLimitInfo(true);
          return;
        }

        // All checks passed, accept the files
        setFiles(acceptedFiles);
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted, profile, subscriptionLimit, onFileSizeError]
  );

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFilesAccepted(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles: maxBatchLimit, // Use the subscription batch limit
    maxSize: subscriptionLimit, // Always use the subscription limit (defaults to free tier if no profile)
    accept,
    multiple: maxBatchLimit > 1, // Only allow multiple files if batch limit > 1
  });

  // Calculate effective max size (either from props or subscription)
  const effectiveMaxSize = Math.min(maxSize, subscriptionLimit);

  // Calculate effective max files (either from props or subscription)
  const effectiveMaxFiles = Math.min(maxFiles, maxBatchLimit);

  // Get subscription tier name
  const getSubscriptionTierName = () => {
    if (userStats) {
      return userStats.subscription_tier.charAt(0).toUpperCase() + userStats.subscription_tier.slice(1);
    } else if (profile) {
      return profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1);
    } else {
      return 'Free';
    }
  };

  return (
    <div className="w-full">
      {/* Subscription Limit Info - For authenticated users */}
      {userStats ? (
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span className="font-medium">{getSubscriptionTierName()} Plan: </span>
            <span>{userStats.max_file_size_mb}MB max file size</span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-medium">Files: </span>
            {userStats.subscription_tier === 'free' ? (
              <span>{userStats.daily_files_used} / {userStats.daily_files_limit} daily</span>
            ) : userStats.monthly_files_limit > 0 ? (
              <span>{userStats.monthly_files_used} / {userStats.monthly_files_limit} monthly</span>
            ) : (
              <span>Pay-per-use</span>
            )}
          </div>
        </div>
      ) : profile ? (
        /* Legacy profile info */
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span className="font-medium">{getSubscriptionTierName()} Plan: </span>
            <span>{formatFileSize(profile.file_size_limit)} max file size</span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-medium">Storage: </span>
            <span>{formatFileSize(profile.usage)} / {formatFileSize(profile.file_size_limit)} used</span>
          </div>
        </div>
      ) : (
        /* Free tier info for unauthenticated users */
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Free Plan: </span>
            <span>{formatFileSize(subscriptionLimit)} max file size</span>
          </div>
          <div className="text-xs text-gray-500">
            <a href="/login" className="text-primary-600 hover:text-primary-500">
              Log in for more storage
            </a>
          </div>
        </div>
      )}

      {/* Usage Bar - Only for authenticated users */}
      {userStats ? (
        <div className="mb-4">
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            {userStats.subscription_tier === 'free' ? (
              /* Daily usage for free tier */
              <div
                className={`h-1.5 rounded-full ${
                  userStats.daily_files_used / userStats.daily_files_limit > 0.9
                    ? 'bg-red-500'
                    : userStats.daily_files_used / userStats.daily_files_limit > 0.7
                      ? 'bg-yellow-500'
                      : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min((userStats.daily_files_used / userStats.daily_files_limit) * 100, 100)}%` }}
              ></div>
            ) : userStats.monthly_files_limit > 0 ? (
              /* Monthly usage for subscription tiers */
              <div
                className={`h-1.5 rounded-full ${
                  userStats.monthly_files_used / userStats.monthly_files_limit > 0.9
                    ? 'bg-red-500'
                    : userStats.monthly_files_used / userStats.monthly_files_limit > 0.7
                      ? 'bg-yellow-500'
                      : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min((userStats.monthly_files_used / userStats.monthly_files_limit) * 100, 100)}%` }}
              ></div>
            ) : (
              /* Pay-per-use tier - no usage bar */
              <div className="h-1.5 rounded-full bg-primary-500" style={{ width: '0%' }}></div>
            )}
          </div>
        </div>
      ) : profile && (
        /* Legacy usage bar */
        <div className="mb-4">
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className={`h-1.5 rounded-full ${
                profile.usage / profile.file_size_limit > 0.9
                  ? 'bg-red-500'
                  : profile.usage / profile.file_size_limit > 0.7
                    ? 'bg-yellow-500'
                    : 'bg-primary-500'
              }`}
              style={{ width: `${Math.min((profile.usage / profile.file_size_limit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : isDragReject
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {t(`tools.${toolType}.upload_prompt`)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {effectiveMaxFiles > 1
            ? `Up to ${effectiveMaxFiles} PDF files, ${formatFileSize(effectiveMaxSize)} each`
            : `PDF file up to ${formatFileSize(effectiveMaxSize)}`}
        </p>

        {/* Show usage limits */}
        {userStats ? (
          <p className="mt-1 text-xs text-gray-500">
            {userStats.subscription_tier === 'free' ? (
              `Daily limit: ${userStats.daily_files_used} of ${userStats.daily_files_limit} files used`
            ) : userStats.monthly_files_limit > 0 ? (
              `Monthly limit: ${userStats.monthly_files_used} of ${userStats.monthly_files_limit} files used`
            ) : userStats.subscription_tier === 'pay_per_use' ? (
              `Pay-per-use: $0.10 per 10MB, $0.05 per additional file`
            ) : (
              `Unlimited usage`
            )}
          </p>
        ) : profile ? (
          <p className="mt-1 text-xs text-gray-500">
            Remaining storage: {formatFileSize(Math.max(0, profile.file_size_limit - profile.usage))}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Free tier limit: {formatFileSize(subscriptionLimit)}
          </p>
        )}
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
              >
                <div className="flex items-center">
                  <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upgrade Prompt */}
      {showLimitInfo && (
        <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">File Limit Reached</h3>
              <div className="mt-2 text-sm text-yellow-700">
                {userStats ? (
                  /* For authenticated users with new stats */
                  <>
                    <p>
                      Your current {getSubscriptionTierName()} plan allows:
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Files up to {userStats.max_file_size_mb}MB each</li>
                      {userStats.subscription_tier === 'free' ? (
                        <li>{userStats.daily_files_limit} files per day (used: {userStats.daily_files_used})</li>
                      ) : userStats.monthly_files_limit > 0 ? (
                        <li>{userStats.monthly_files_limit} files per month (used: {userStats.monthly_files_used})</li>
                      ) : (
                        <li>Pay-per-use pricing</li>
                      )}
                      {userStats.max_batch_size > 1 && (
                        <li>Batch processing up to {userStats.max_batch_size} files</li>
                      )}
                    </ul>
                    <div className="mt-4">
                      <a
                        href="/pricing"
                        className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      >
                        Upgrade Your Plan
                      </a>
                    </div>
                  </>
                ) : profile ? (
                  /* For authenticated users with legacy profile */
                  <>
                    <p>
                      Your current {getSubscriptionTierName()} plan allows files up to {formatFileSize(profile.file_size_limit)}.
                    </p>
                    <p className="mt-1">
                      You have used {formatFileSize(profile.usage)} of your {formatFileSize(profile.file_size_limit)} storage.
                    </p>
                    <div className="mt-4">
                      <a
                        href="/pricing"
                        className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      >
                        Upgrade Your Plan
                      </a>
                    </div>
                  </>
                ) : (
                  /* For unauthenticated users */
                  <>
                    <p>
                      The free plan allows:
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Files up to 10MB each</li>
                      <li>5 files per day</li>
                      <li>No batch processing</li>
                    </ul>
                    <p className="mt-2">
                      Sign up or log in to access higher limits or pay-per-use options.
                    </p>
                    <div className="mt-4 flex space-x-4">
                      <a
                        href="/login"
                        className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      >
                        Log In
                      </a>
                      <a
                        href="/signup"
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-600 shadow-sm ring-1 ring-inset ring-primary-300 hover:bg-gray-50"
                      >
                        Sign Up
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
