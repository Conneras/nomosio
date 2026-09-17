# Email με τον κωδικό σύνδεσης (Supabase Auth)

Η σελίδα /kiniseis ζητά 6ψήφιο κωδικό. Η Supabase στέλνει έναν σύνδεσμο αν το πρότυπο δεν γράφει `{{ .Token }}`.
Γι' αυτό μπαίνει το ίδιο κείμενο σε **δύο** πρότυπα: ο καινούριος χρήστης παίρνει το «Confirm signup», όποιος ξαναμπαίνει παίρνει το «Magic Link».

Πού: Supabase → project **nomosio** → Authentication → Emails → Templates.

Ρύθμιση που πάει μαζί: Authentication → Providers → Email → **Email OTP Expiration = 900** (15 λεπτά, όσα γράφει το email).

---

## 1. Confirm signup

**Subject:**

```
Ο κωδικός σύνδεσης στο Νομόσιο
```

**Body (HTML):**

```html
<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#23262B;max-width:480px">
  <p style="font-size:20px;letter-spacing:.12em;margin:0 0 16px">ΝΟΜΟΣΙΟ</p>
  <p>Ο κωδικός σύνδεσής σου είναι:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:.2em;margin:8px 0 16px">{{ .Token }}</p>
  <p>Γράψε τον στη σελίδα Έξυπνες Κινήσεις του nomosio.gr. Ισχύει για 15 λεπτά και μόνο μία φορά.</p>
  <p>Αν δεν ζήτησες εσύ αυτόν τον κωδικό, αγνόησε αυτό το email. Χωρίς τον κωδικό κανείς δεν μπαίνει στον λογαριασμό.</p>
  <p style="color:#6A6D74;font-size:13px">Νομόσιο · nomosio.gr</p>
</div>
```

## 2. Magic Link

Ίδιο θέμα, ίδιο κείμενο με το «Confirm signup».

---

Έλεγχος μετά την αλλαγή: από τη σελίδα /kiniseis ζήτα κωδικό με ένα email που **δεν** έχει μπει ποτέ, και μετά ξανά με το ίδιο. Και τις δύο φορές πρέπει να έρθει αριθμός, όχι σύνδεσμος.
