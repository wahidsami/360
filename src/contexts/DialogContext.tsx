import React from 'react';
import { Button, Input, Modal } from '@/components/ui/UIComponents';

type DialogTone = 'primary' | 'danger';

type BaseDialogOptions = {
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
};

export type ConfirmDialogOptions = BaseDialogOptions;
export type AlertDialogOptions = Omit<BaseDialogOptions, 'cancelText'>;
export type PromptDialogOptions = BaseDialogOptions & {
  placeholder?: string;
  defaultValue?: string;
  inputLabel?: string;
  validate?: (value: string) => string | null;
};

type DialogKind = 'confirm' | 'alert' | 'prompt';

type DialogRequest = {
  id: number;
  kind: DialogKind;
  options: ConfirmDialogOptions | AlertDialogOptions | PromptDialogOptions;
  resolve: (value: boolean | void | string | null) => void;
};

type AppDialogApi = {
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;
  alert: (options: AlertDialogOptions | string) => Promise<void>;
  prompt: (options: PromptDialogOptions | string) => Promise<string | null>;
};

const DialogContext = React.createContext<AppDialogApi | null>(null);

let dialogIdCounter = 0;

const normalizeConfirmOptions = (options: ConfirmDialogOptions | string): ConfirmDialogOptions => {
  if (typeof options === 'string') return { message: options };
  return options;
};

const normalizeAlertOptions = (options: AlertDialogOptions | string): AlertDialogOptions => {
  if (typeof options === 'string') return { message: options };
  return options;
};

const normalizePromptOptions = (options: PromptDialogOptions | string): PromptDialogOptions => {
  if (typeof options === 'string') return { message: options };
  return options;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queueRef = React.useRef<DialogRequest[]>([]);
  const [current, setCurrent] = React.useState<DialogRequest | null>(null);
  const [promptValue, setPromptValue] = React.useState('');
  const [promptError, setPromptError] = React.useState<string | null>(null);

  const processQueue = React.useCallback(() => {
    if (current) return;
    const next = queueRef.current.shift() || null;
    setCurrent(next);
    if (next?.kind === 'prompt') {
      const options = next.options as PromptDialogOptions;
      setPromptValue(options.defaultValue ?? '');
      setPromptError(null);
    }
  }, [current]);

  const enqueue = React.useCallback(
    (kind: DialogKind, options: ConfirmDialogOptions | AlertDialogOptions | PromptDialogOptions) => {
      return new Promise<any>((resolve) => {
        queueRef.current.push({
          id: ++dialogIdCounter,
          kind,
          options,
          resolve,
        });
        processQueue();
      });
    },
    [processQueue],
  );

  const closeCurrent = React.useCallback(() => {
    setCurrent(null);
    // Let React commit close before opening next queued dialog.
    setTimeout(() => {
      const next = queueRef.current.shift() || null;
      setCurrent(next);
      if (next?.kind === 'prompt') {
        const options = next.options as PromptDialogOptions;
        setPromptValue(options.defaultValue ?? '');
        setPromptError(null);
      }
    }, 0);
  }, []);

  const confirm = React.useCallback((options: ConfirmDialogOptions | string) => enqueue('confirm', normalizeConfirmOptions(options)) as Promise<boolean>, [enqueue]);
  const alert = React.useCallback((options: AlertDialogOptions | string) => enqueue('alert', normalizeAlertOptions(options)) as Promise<void>, [enqueue]);
  const prompt = React.useCallback((options: PromptDialogOptions | string) => enqueue('prompt', normalizePromptOptions(options)) as Promise<string | null>, [enqueue]);

  const api = React.useMemo<AppDialogApi>(() => ({ confirm, alert, prompt }), [alert, confirm, prompt]);

  const title = (current?.options.title || (current?.kind === 'prompt' ? 'Input Required' : 'Please Confirm')) as string;
  const message = current?.options.message || '';
  const confirmText = current?.options.confirmText || (current?.kind === 'alert' ? 'OK' : 'Confirm');
  const cancelText = current?.options.cancelText || 'Cancel';
  const tone = current?.options.tone || 'primary';

  const resolveAndClose = (value: boolean | void | string | null) => {
    if (!current) return;
    current.resolve(value);
    closeCurrent();
  };

  const handlePromptConfirm = () => {
    if (!current || current.kind !== 'prompt') return;
    const options = current.options as PromptDialogOptions;
    const value = promptValue;
    const error = options.validate ? options.validate(value) : null;
    if (error) {
      setPromptError(error);
      return;
    }
    resolveAndClose(value);
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        isOpen={!!current}
        onClose={() => resolveAndClose(current?.kind === 'prompt' ? null : current?.kind === 'alert' ? undefined : false)}
        title={title}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-300">{message}</div>
          {current?.kind === 'prompt' && (
            <div className="space-y-2">
              <Input
                label={(current.options as PromptDialogOptions).inputLabel}
                placeholder={(current.options as PromptDialogOptions).placeholder}
                value={promptValue}
                onChange={(event) => {
                  setPromptValue(event.target.value);
                  if (promptError) setPromptError(null);
                }}
                autoFocus
              />
              {promptError && <p className="text-xs text-rose-400">{promptError}</p>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {current?.kind !== 'alert' && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => resolveAndClose(current?.kind === 'prompt' ? null : false)}
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="button"
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => {
                if (current?.kind === 'prompt') {
                  handlePromptConfirm();
                  return;
                }
                resolveAndClose(current?.kind === 'confirm' ? true : undefined);
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    </DialogContext.Provider>
  );
};

export const useAppDialog = (): AppDialogApi => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useAppDialog must be used within a DialogProvider');
  }
  return context;
};

