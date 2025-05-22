-- Create function to record a file operation
CREATE OR REPLACE FUNCTION record_file_operation(
  p_user_id UUID,
  p_operation_type operation_type_enum,
  p_file_size_bytes BIGINT,
  p_file_count INTEGER DEFAULT 1,
  p_input_filename TEXT DEFAULT NULL,
  p_output_filename TEXT DEFAULT NULL
)
RETURNS TABLE (
  operation_id INTEGER,
  is_valid BOOLEAN,
  error_message TEXT,
  cost_cents INTEGER
) AS $$
DECLARE
  v_validation RECORD;
  v_operation_id INTEGER;
BEGIN
  -- First validate the operation
  SELECT * INTO v_validation 
  FROM validate_file_operation(p_user_id, p_operation_type, p_file_size_bytes, p_file_count);
  
  -- If operation is valid, record it
  IF v_validation.is_valid THEN
    INSERT INTO file_operations (
      user_id,
      operation_type,
      file_size_bytes,
      file_count,
      input_filename,
      output_filename,
      success,
      error_message
    ) VALUES (
      p_user_id,
      p_operation_type,
      p_file_size_bytes,
      p_file_count,
      p_input_filename,
      p_output_filename,
      true,
      NULL
    ) RETURNING id INTO v_operation_id;
  ELSE
    -- Record the failed operation attempt
    INSERT INTO file_operations (
      user_id,
      operation_type,
      file_size_bytes,
      file_count,
      input_filename,
      output_filename,
      success,
      error_message
    ) VALUES (
      p_user_id,
      p_operation_type,
      p_file_size_bytes,
      p_file_count,
      p_input_filename,
      p_output_filename,
      false,
      v_validation.error_message
    ) RETURNING id INTO v_operation_id;
  END IF;
  
  -- Return the result
  RETURN QUERY SELECT 
    v_operation_id,
    v_validation.is_valid,
    v_validation.error_message,
    v_validation.cost_cents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
