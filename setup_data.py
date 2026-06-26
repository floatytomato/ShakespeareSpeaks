import os
import urllib.error
import urllib.request

# Define directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")

# Define target database path
DB_PATH = os.path.join(DATA_DIR, "shakespeare.db")

# URLs to try for downloading shakespeare.db
DB_URLS = [
    "https://github.com/catherinedevlin/opensourceshakespeare/raw/master/shakespeare.db",
    "https://github.com/catherinedevlin/opensourceshakespeare/raw/main/shakespeare.db",
]

# Historical documents to generate
HISTORICAL_DOCS = {
    "biography.md": """# William Shakespeare: Biography

## Early Life and Education (1564–1582)
William Shakespeare was born in Stratford-upon-Avon, a market town in Warwickshire, England. He was baptized on April 26, 1564, and his birth is traditionally celebrated on April 23 (St. George's Day), which is also the date of his death.
*   **Parents:** John Shakespeare, a successful glover and alderman, and Mary Arden, the daughter of an affluent landowning farmer.
*   **Education:** He likely attended the King's New School in Stratford. The grammar school curriculum centered on Latin, classical rhetoric, and literature (including Virgil, Ovid, and Terence), providing him with a strong literary foundation.

## Marriage and Family
In November 1582, at age 18, Shakespeare married Anne Hathaway, who was 26.
*   **Children:** They had three children. Susanna (baptized May 1583), and twins Hamnet and Judith (baptized February 1585).
*   **Tragedy:** Hamnet, his only son, died of unknown causes at age 11 in 1596, a loss that many scholars believe deeply influenced his later tragic plays, particularly *Hamlet*.

## The "Lost Years" (1585–1592)
The period between 1585 and 1592 is known as the "lost years" because no documentary evidence exists regarding Shakespeare's activities. Various legends suggest he may have been a schoolmaster, a lawyer's clerk, or fled Stratford after poaching deer from local landowner Thomas Lucy.

## London Career and Success (1592–1613)
By 1592, Shakespeare was established in London as an actor and playwright.
*   **First Mention:** He was famously criticized by rival playwright Robert Greene in 1592 as an "upstart Crow, beautified with our feathers."
*   **Lord Chamberlain's Men:** In 1594, Shakespeare became a founding member, shareholder, and primary playwright of the Lord Chamberlain's Men, which became the leading playing company in London.
*   **The Globe Theatre:** In 1599, the company built the Globe Theatre on the south bank of the River Thames. Shakespeare owned a share of the theatre, which made him wealthy.
*   **The King's Men:** In 1603, upon the accession of King James I, the company was awarded a royal patent and renamed the King's Men. In 1608, they acquired the indoor Blackfriars Theatre.

## Retirement and Death (1613–1616)
Shakespeare retired to Stratford around 1613, living in New Place, one of the largest houses in the town.
*   **Death:** He died on April 23, 1616, at the age of 52, and was buried in the chancel of Holy Trinity Church in Stratford.
*   **Will:** In his will, he left the bulk of his estate to his eldest daughter, Susanna, and famously bequeathed his "second best bed" to his wife, Anne Hathaway.
""",
    "elizabethan_era.md": """# Historical Context: The Elizabethan and Jacobean Eras

## The Tudor and Stuart Monarchs
Shakespeare's career spanned two distinct historical eras named after the ruling English monarchs:
1.  **The Elizabethan Era (1558–1603):** Ruled by Queen Elizabeth I, the last Tudor monarch. This was a golden age of English nationalism, commercial expansion, and cultural flowering (the English Renaissance).
2.  **The Jacobean Era (1603–1625):** Ruled by King James I (previously James VI of Scotland), the first Stuart monarch. James was a patron of the arts, literature, and demonology. Under his reign, Shakespeare's plays became darker and more politically complex (e.g., *Macbeth* and *King Lear*).

## Religious and Political Context
*   **The Protestant Reformation:** England was a Protestant nation, but tensions with Catholic factions remained high. Plots against Elizabeth I and James I were common.
*   **The Gunpowder Plot (1605):** A failed assassination attempt by Catholic conspirators to blow up Parliament and King James I. This event inspired themes of treason, equivocation, and regicide in *Macbeth*.
*   **Divine Right of Kings:** King James I strongly advocated the doctrine that kings derived their authority directly from God and could not be judged by subjects. Shakespeare explored the consequences of violating this order in *Richard II*, *Macbeth*, and *Julius Caesar*.

## The Bubonic Plague
The bubonic plague was a recurring threat in early modern London.
*   **Theatre Closures:** Whenever weekly plague deaths exceeded a certain threshold (usually 30 or 40), the Privy Council closed all public theatres to prevent the spread of infection.
*   **Impact on Shakespeare:** Long closures in 1592–1594 and 1603 forced Shakespeare's company to tour the provinces. During these closures, Shakespeare turned to writing non-dramatic poetry, publishing his long narrative poems *Venus and Adonis* (1593) and *The Rape of Lucrece* (1594), and composing many of his sonnets.
""",
    "theatre.md": """# The Elizabethan Theatre Industry

## Playhouses and Venues
In Shakespeare's time, theatrical performances shifted from traveling troupes in taverns to permanent public playhouses.
1.  **Public Amphitheatres (e.g., The Globe, The Rose):** Large, open-air circular theatres.
    *   **Structure:** A thrust stage extending into an open yard, surrounded by three tiers of roofed galleries.
    *   **Audience:** The "groundlings" stood in the yard for 1 penny, exposed to the elements. Wealthier patrons paid 2 or more pennies for seats in the galleries. Capacity reached up to 3,000.
2.  **Private Indoor Theatres (e.g., Blackfriars):** Smaller, rectangular, fully enclosed spaces.
    *   **Structure:** Lit by candles, which allowed for night performances and atmospheric lighting effects.
    *   **Audience:** Seats were much more expensive (starting at 6 pennies), attracting a wealthier, more aristocratic crowd.

## Staging and Performance Conventions
*   **Spoken Decor:** Early modern theatres had no elaborate painted scenery. Playwrights relied on "spoken decor"—verbal descriptions in the dialogue—to establish setting, time of day, and weather.
*   **Costumes:** Costumes were contemporary, lavish Elizabethan clothing, often donated or sold by noble patrons, regardless of the historical period of the play.
*   **No Women on Stage:** By law and social custom, women were forbidden from acting in public plays. All female roles (such as Juliet, Lady Macbeth, and Cleopatra) were played by young boy actors whose voices had not yet broken.
*   **Natural Lighting:** Amphitheatre performances took place in the afternoon (typically between 2 PM and 5 PM) to utilize natural daylight.

## The Acting Companies
Actors formed cooperative guilds or companies under the legal protection of noble patrons to avoid being classified as "rogues and vagabonds."
*   **Lord Chamberlain's Men / King's Men:** Shakespeare's company. Members shared both the profits and expenses.
*   **Key Figures:**
    *   **Richard Burbage:** The company's leading tragic actor who originated roles like Hamlet, Othello, King Lear, and Richard III.
    *   **Will Kempe:** A famous physical comedian and dancer known for his slapstick clown roles (e.g., Dogberry, Bottom).
    *   **Robert Armin:** Succeeded Kempe around 1600. A more intellectual, musical fool who inspired Shakespeare to write complex "wise fools" like the Fool in *King Lear* and Feste in *Twelfth Night*.
""",
    "contemporaries.md": """# Shakespeare's Literary Contemporaries

## Christopher Marlowe (1564–1593)
Born in the same year as Shakespeare, Marlowe was the leading playwright of London before his sudden, early death.
*   **Blank Verse:** Marlowe revolutionized English drama by introducing "mighty line" blank verse (unrhymed iambic pentameter).
*   **Major Works:** *Doctor Faustus*, *Tamburlaine the Great*, *The Jew of Malta*.
*   **Death:** He was stabbed to death in a rooming house in Deptford in 1593 during an argument over a bill (the "reckoning"), though rumors persist that he was assassinated due to his involvement in government espionage.
*   **Influence:** Marlowe's style heavily influenced Shakespeare's early history plays (like *Richard III*).

## Ben Jonson (1572–1637)
A brilliant classicist, poet, and dramatist, Jonson was both Shakespeare's closest literary rival and a dear friend.
*   **Comedy of Humours:** Jonson popularized comedies based on characters dominated by a single psychological trait or "humour."
*   **Major Works:** *Volpone*, *The Alchemist*, *Every Man in His Humour* (in which Shakespeare himself acted).
*   **First Folio Tribute:** Jonson wrote the prefatory poem for the 1623 First Folio of Shakespeare's works, containing the famous lines declaring Shakespeare "not of an age, but for all time!" and calling him the "Sweet Swan of Avon."

## John Fletcher (1579–1625)
A prolific playwright who gained prominence in the Jacobean era.
*   **Collaboration:** Fletcher collaborated directly with Shakespeare on his final works, including *Henry VIII*, *The Two Noble Kinsmen*, and the lost play *Cardenio*.
*   **Succession:** Following Shakespeare's retirement around 1613, Fletcher succeeded him as the chief house playwright for the King's Men.
*   **Tragicomedy:** Fletcher helped popularize the genre of tragicomedy, which influenced Shakespeare's late romance plays (like *The Tempest* and *The Winter's Tale*).
""",
}


def setup():
    # 1. Create directories
    print("Creating directories...")
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(HISTORY_DIR, exist_ok=True)
    print(f"Created {DATA_DIR} and {HISTORY_DIR}")

    # 2. Download SQLite database
    if os.path.exists(DB_PATH):
        print(f"Database already exists at {DB_PATH}. Skipping download.")
    else:
        download_success = False
        for url in DB_URLS:
            print(f"Attempting to download database from {url}...")
            try:
                # Set a User-Agent header to avoid potential rate-limiting or blocking
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                )
                with urllib.request.urlopen(req) as response:
                    with open(DB_PATH, "wb") as out_file:
                        out_file.write(response.read())
                print(f"Successfully downloaded database to {DB_PATH}")
                download_success = True
                break
            except urllib.error.URLError as e:
                print(f"Error downloading from {url}: {e}")
            except Exception as e:
                print(f"Unexpected error: {e}")

        if not download_success:
            print(
                "FAILED to download database from all sources. Please check your internet connection or download it manually."
            )
            return False

    # 3. Create historical documents
    print("Generating historical facts markdown database...")
    for filename, content in HISTORICAL_DOCS.items():
        filepath = os.path.join(HISTORY_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content.strip() + "\n")
        print(f"Generated {filepath}")

    print("Setup completed successfully!")
    return True


if __name__ == "__main__":
    setup()
