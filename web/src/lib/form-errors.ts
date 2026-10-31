type FieldMessage = { message?: string } | undefined;

export function presentErrors(...errors: FieldMessage[]): { message?: string }[] {
  return errors.filter((error): error is { message?: string } => Boolean(error?.message));
}
