
import { environment } from '../env';


registerSettingsPage(({ settingsStorage }) => {
  if(!settingsStorage.getItem("behavior.mode")) {
    settingsStorage.setItem("behavior.mode", JSON.stringify({ selected: [0] }))
  }

  if(!settingsStorage.getItem("behavior.album_whitelist")) {
    settingsStorage.setItem("behavior.album_whitelist", JSON.stringify([{ name: '.*' }]))
  }

  function getList(name: string): {name: string}[] {
    return JSON.parse(settingsStorage.getItem(name)) || []
  }

  function handleListEdit(newValue: string, oldValue: string, key: string) {
      const items = getList(key)
      for(let i = 0; i < items.length; i++) {
        if(items[i].name == oldValue) {
          items[i].name = newValue;
        }

        if(!items[i].name.trim()) {
          console.log("removing empty entry");
          // remove item
          items.splice(i, 1);
          i--;
        }
      }

      console.log(`Setting ${key} to: ${JSON.stringify(items)}`);
      settingsStorage.setItem(key, JSON.stringify(items));
  
  }
  

  const currentMode = JSON.parse(settingsStorage.getItem("behavior.mode")).selected[0]

  return (
    <Page>
      <Section
        title={<Text bold align="center">Authentication</Text>}>
        <Oauth
          settingsKey="oauth"
          title="Google Login"
          label="OAuth"
          status={ settingsStorage.getItem("oauth") ? "Signed in" : "Sign in" }
          authorizeUrl="https://accounts.google.com/o/oauth2/auth"
          requestTokenUrl="https://oauth2.googleapis.com/token"
          clientId={ environment.clientId }
          clientSecret={ environment.clientSecret }
          oAuthParams={{
            // @ts-ignore
            access_type: "offline", // required so that we get a refresh token
            prompt: "consent"
          }}
          scope="https://www.googleapis.com/auth/photoslibrary.readonly"
          pkce />
      </Section>
      <Section  
        title={<Text bold align="center">Behavior</Text>}>
        <Select
          label={`Mode`}
          settingsKey="behavior.mode"
          options={[
            { name: "Blacklist" },
            { name: "Whitelist" }
          ]} />
        {currentMode === 0 &&
          <AdditiveList
            title={<Text>Blacklist (Regex)</Text>}
            renderItem={ option =>
              (<TextInput value={option.name} onChange={ 
                newValue => handleListEdit(newValue, option.name, "behavior.album_blacklist")
              } />)
            }
            settingsKey="behavior.album_blacklist" />}

        {currentMode === 1 &&
          <AdditiveList
            title={<Text>Whitelist (Regex)</Text>}
            renderItem={ option =>
              (<TextInput value={option.name} onChange={ 
                (newValue) => handleListEdit(
                  // @ts-ignore
                  newValue.name, option.name, "behavior.album_whitelist")
              } />)
            }
            settingsKey="behavior.album_whitelist" />}
      </Section>
    </Page>
  );
});
