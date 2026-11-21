interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly lang?: string;
}

interface ChoiceGroupProps<T extends string> {
  readonly name: string;
  readonly legend: string;
  readonly hint?: string;
  readonly choices: readonly Choice<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function ChoiceGroup<T extends string>(props: ChoiceGroupProps<T>) {
  const hintId = `${props.name}-hint`;
  return (
    <fieldset
      className="settings-group"
      aria-describedby={props.hint === undefined ? undefined : hintId}
    >
      <legend>{props.legend}</legend>
      {props.hint === undefined ? null : (
        <p id={hintId} className="settings-hint">
          {props.hint}
        </p>
      )}
      <div className="settings-choices">
        {props.choices.map((choice) => (
          <label key={choice.value} className="settings-choice">
            <input
              type="radio"
              name={props.name}
              value={choice.value}
              checked={choice.value === props.value}
              onChange={() => {
                props.onChange(choice.value);
              }}
            />
            <span lang={choice.lang}>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
