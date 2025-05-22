import { supabase } from './client';

export interface FileRecord {
  id: string;
  user_id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  operation_type: 'compress' | 'merge' | 'split' | 'convert';
  created_at: string;
}

// Upload a file to Supabase Storage
export const uploadFile = async (
  file: File,
  userId: string,
  operationType: 'compress' | 'merge' | 'split' | 'convert'
): Promise<{ data: FileRecord | null; error: Error | null }> => {
  try {
    // Create a unique file path
    const filePath = `${userId}/${operationType}/${Date.now()}_${file.name}`;
    
    // Upload the file to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('pdf_files')
      .upload(filePath, file);
      
    if (storageError) {
      throw storageError;
    }
    
    // Create a record in the files table
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        operation_type: operationType,
      })
      .select()
      .single();
      
    if (fileError) {
      throw fileError;
    }
    
    return { data: fileData as FileRecord, error: null };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { data: null, error: error as Error };
  }
};

// Get a list of files for a user
export const getUserFiles = async (
  userId: string,
  operationType?: 'compress' | 'merge' | 'split' | 'convert'
): Promise<{ data: FileRecord[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('files')
      .select('*')
      .eq('user_id', userId);
      
    if (operationType) {
      query = query.eq('operation_type', operationType);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return { data: data as FileRecord[], error: null };
  } catch (error) {
    console.error('Error getting user files:', error);
    return { data: null, error: error as Error };
  }
};

// Get a signed URL for a file
export const getFileUrl = async (
  path: string
): Promise<{ url: string | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.storage
      .from('pdf_files')
      .createSignedUrl(path, 60); // URL valid for 60 seconds
      
    if (error) {
      throw error;
    }
    
    return { url: data.signedUrl, error: null };
  } catch (error) {
    console.error('Error getting file URL:', error);
    return { url: null, error: error as Error };
  }
};

// Delete a file from Supabase Storage
export const deleteFile = async (
  path: string,
  fileId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('pdf_files')
      .remove([path]);
      
    if (storageError) {
      throw storageError;
    }
    
    // Delete the file record from the database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);
      
    if (dbError) {
      throw dbError;
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error as Error };
  }
};
