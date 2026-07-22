"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "najm-kit";

import { getApiErrorMessage } from "@/services/apiError";

interface EntityCommandOptions<TData, TVariables, TContext>
  extends Omit<
    UseMutationOptions<TData, Error, TVariables, TContext>,
    "mutationFn" | "onError" | "onSuccess"
  > {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidate?: QueryKey[];
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void;
}

export function useEntityCommand<
  TData,
  TVariables = void,
  TContext = unknown,
>({
  errorMessage,
  invalidate = [],
  mutationFn,
  onError,
  onSuccess,
  successMessage,
  ...options
}: EntityCommandOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    ...options,
    mutationFn,
    onSuccess: async (data, variables, context) => {
      await Promise.all(
        invalidate.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );

      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(getApiErrorMessage(error, errorMessage));
      onError?.(error, variables, context);
    },
  });
}
