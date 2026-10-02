# CSV Upload Format Guide

## Required Columns

| Column     | Description                                      | Required |
|------------|--------------------------------------------------|----------|
| `question` | The question text                                | ✅ Yes   |
| `type`     | Question type: `mc`, `tf`, or `sa`               | ✅ Yes   |
| `choice_a` | First choice (MC only)                           | MC only  |
| `choice_b` | Second choice (MC only)                          | MC only  |
| `choice_c` | Third choice (MC only, optional)                 | No       |
| `choice_d` | Fourth choice (MC only, optional)                | No       |
| `answer`   | The correct answer (see rules below)             | ✅ Yes   |
| `points`   | Point value for the question (default: 1)        | No       |

---

## Answer Format Rules

### Multiple Choice (`type = mc`)
- Set `answer` to the **exact text** of the correct choice.
- Example: if `choice_a` is `Manila`, set `answer` to `Manila`.

### True/False (`type = tf`)
- Set `answer` to either `True` or `False` (capital first letter).
- Leave `choice_a` through `choice_d` blank.

### Short Answer (`type = sa`)
- Set `answer` to the expected answer string.
- Grading is **case-insensitive** (e.g. `jose rizal` matches `Jose Rizal`).
- Leave `choice_a` through `choice_d` blank.

---

## Example Rows

```
question,type,choice_a,choice_b,choice_c,choice_d,answer,points
What is 2+2?,mc,3,4,5,6,4,1
The sky is blue.,tf,,,,,True,1
Name the first President of the Philippines.,sa,,,,,Emilio Aguinaldo,2
```

---

## Tips
- Save as `.csv` (UTF-8 encoding recommended).
- The first row must be the header row exactly as shown.
- Rows with empty `question` or `answer` fields are skipped automatically.
- You can import multiple times — questions are always appended, never replaced.
